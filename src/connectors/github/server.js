#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createClient } from "./github.js";
import { ensureAuth } from "./auth.js";

const server = new McpServer({ name: "aidos-github", version: "1.0.0" });

let ghClient;
let ghLogin;

async function getClient() {
  if (!ghClient) {
    const { token, login } = await ensureAuth();
    ghClient = createClient(token);
    ghLogin = login;
  }
  return { client: ghClient, login: ghLogin };
}

/**
 * Resolve a GitHub workspace for the given user:
 * - Ensures the user's aidos/{login} branch exists (creating or syncing it)
 * - Discovers .aidos/ folders and their write configuration
 *
 * @param {object} client - GitHub API client
 * @param {string} login - GitHub username
 * @param {string} repoFullName - "owner/repo"
 * @param {string|null} branchOverride - override branch name (default: aidos/{login})
 * @returns {object} workspace descriptor
 */
export async function resolveWorkspace(client, login, repoFullName, branchOverride) {
  const [owner, repo] = repoFullName.split("/");
  const repoInfo = await client.getRepo(owner, repo);
  const defaultBranch = repoInfo.default_branch;

  const branchName = branchOverride || `aidos/${login}`;
  let branchCreated = false;

  // Check if user branch exists
  let userBranchSha;
  try {
    const existing = await client.getBranch(owner, repo, branchName);
    userBranchSha = existing.commit.sha;
    // Branch exists — sync by merging default branch into user branch
    try {
      await client.merge(owner, repo, branchName, defaultBranch, `Sync ${defaultBranch} into ${branchName}`);
    } catch (err) {
      // 409 = conflict, 204 = already up to date — both are acceptable
      if (!err.message.includes("409") && !err.message.includes("204")) {
        // Not a known benign error — still continue, sync is best-effort
        console.error(`Merge warning: ${err.message}`);
      }
    }
  } catch (err) {
    if (!err.message.includes("404")) {
      throw err;
    }
    // Branch does not exist — create from default branch
    const baseBranch = await client.getBranch(owner, repo, defaultBranch);
    const baseSha = baseBranch.commit.sha;
    await client.createBranch(owner, repo, branchName, baseSha);
    branchCreated = true;

    // Use the base SHA as the head SHA (branch was created from this commit)
    userBranchSha = baseSha;
  }

  // Get full tree for the user branch
  const tree = await client.getTree(owner, repo, userBranchSha);

  // Find all .aidos/ folder paths by scanning tree entries
  const aidosFolderSet = new Set();
  for (const entry of tree.tree) {
    const match = entry.path.match(/^(.*\.aidos)\//);
    if (match) {
      aidosFolderSet.add(match[1]);
    }
  }

  // Default write config
  const defaultWrite = { strategy: "pr", target: defaultBranch, reviewers: [] };

  // For each .aidos/ folder, find manifest.json and extract write config
  const aidosFolders = await Promise.all(
    Array.from(aidosFolderSet).map(async (folderPath) => {
      const manifestPath = `${folderPath}/manifest.json`;
      const manifestEntry = tree.tree.find(
        (e) => e.path === manifestPath && e.type === "blob",
      );

      let write = { ...defaultWrite };
      if (manifestEntry) {
        try {
          const blob = await client.getBlob(owner, repo, manifestEntry.sha);
          const content = Buffer.from(blob.content, blob.encoding || "base64").toString("utf8");
          const manifest = JSON.parse(content);
          if (manifest.write) {
            write = { ...defaultWrite, ...manifest.write };
          }
        } catch {
          // Manifest unreadable — use defaults
        }
      }

      return { path: folderPath, write };
    }),
  );

  return {
    repo: repoFullName,
    branch: branchName,
    branch_created: branchCreated,
    default_branch: defaultBranch,
    aidos_folders: aidosFolders,
  };
}

// ---- Tool registration ----

server.registerTool(
  "open_workspace",
  {
    title: "Open AIDOS Workspace",
    description:
      "Resolve a GitHub repo, ensure the user's aidos/ working branch exists (create or sync), and discover .aidos/ folders with their write configuration.",
    inputSchema: z.object({
      query: z.string().describe("Repository name or org/repo"),
      branch: z
        .string()
        .optional()
        .describe("Override branch name (default: aidos/{username})"),
    }),
  },
  async ({ query, branch }) => {
    const { client, login } = await getClient();

    // Resolve repo — if contains "/" treat as org/repo, else search
    let repoFullName;
    if (query.includes("/")) {
      repoFullName = query;
    } else {
      const results = await client.searchRepos(query);
      if (!results.items || results.items.length === 0) {
        throw new Error(`No repositories found matching "${query}"`);
      }
      repoFullName = results.items[0].full_name;
    }

    const workspace = await resolveWorkspace(client, login, repoFullName, branch || null);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(workspace, null, 2),
        },
      ],
    };
  },
);

// ---- Startup ----

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("aidos-github MCP server started");
}

// Only run when executed directly, not when imported by tests
const isMain = process.argv[1] && (
  import.meta.url === new URL(process.argv[1], import.meta.url).href ||
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"))
);

if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
