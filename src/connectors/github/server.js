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

/**
 * Read all files under an aidosPath prefix from a branch.
 *
 * @param {object} client - GitHub API client
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} branch - Branch name
 * @param {string} aidosPath - Path prefix to filter (e.g. ".aidos")
 * @returns {{ files: Array<{ path: string, content: string, sha: string }> }}
 */
export async function readArtifacts(client, owner, repo, branch, aidosPath) {
  const branchInfo = await client.getBranch(owner, repo, branch);
  const headSha = branchInfo.commit.sha;
  const tree = await client.getTree(owner, repo, headSha);

  const prefix = aidosPath.endsWith("/") ? aidosPath : `${aidosPath}/`;
  const entries = tree.tree.filter(
    (e) => e.type === "blob" && e.path.startsWith(prefix),
  );

  const files = await Promise.all(
    entries.map(async (entry) => {
      const blob = await client.getBlob(owner, repo, entry.sha);
      const content = Buffer.from(blob.content, blob.encoding || "base64").toString("utf8");
      return { path: entry.path, content, sha: entry.sha };
    }),
  );

  return { files };
}

/**
 * Save files to a branch as an atomic commit using the Git Trees API.
 *
 * @param {object} client - GitHub API client
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} branch - Branch name
 * @param {Array<{ path: string, content: string }>} files - Files to write
 * @param {string} message - Commit message suffix
 * @returns {{ commit: string|null, message?: string, files_changed: number }}
 */
export async function saveArtifacts(client, owner, repo, branch, files, message) {
  if (!files || files.length === 0) {
    return { commit: null, message: "Nothing to save", files_changed: 0 };
  }

  const branchInfo = await client.getBranch(owner, repo, branch);
  const headSha = branchInfo.commit.sha;
  const baseTree = await client.getTree(owner, repo, headSha);

  const treeEntries = files.map((f) => ({
    path: f.path,
    mode: "100644",
    type: "blob",
    content: f.content,
  }));

  const newTree = await client.createTree(owner, repo, baseTree.sha, treeEntries);
  const commitMessage = `[aidos] ${message}`;
  const newCommit = await client.createCommit(owner, repo, commitMessage, newTree.sha, [headSha]);
  await client.updateRef(owner, repo, `heads/${branch}`, newCommit.sha);

  return { commit: newCommit.sha, files_changed: files.length };
}

/**
 * Show .aidos/ file diffs between a branch and a target branch.
 *
 * @param {object} client - GitHub API client
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} branch - Source branch (the working branch)
 * @param {string} target - Target branch to compare against
 * @returns {{ files: Array, summary: object }}
 */
export async function diffBranch(client, owner, repo, branch, target) {
  const comparison = await client.compare(owner, repo, target, branch);

  const allFiles = comparison.files || [];
  const files = allFiles
    .filter((f) => f.filename.includes(".aidos/"))
    .map((f) => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      patch: f.patch,
    }));

  const additions = files.reduce((sum, f) => sum + f.additions, 0);
  const deletions = files.reduce((sum, f) => sum + f.deletions, 0);

  return {
    files,
    summary: {
      files_changed: files.length,
      additions,
      deletions,
      commits_ahead: comparison.ahead_by || 0,
    },
  };
}

/**
 * Submit changes via PR or direct push/merge.
 *
 * @param {object} client - GitHub API client
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} branch - Working branch to submit
 * @param {object} opts
 * @param {string} opts.strategy - "pr" or "push"
 * @param {string} opts.target - Target branch (e.g. "main")
 * @param {string[]} [opts.reviewers] - Reviewer logins (@ prefix treated as team)
 * @param {string} [opts.title] - PR title
 * @param {string} [opts.body] - PR body
 * @returns {{ type: "pr", number: number, url: string }|{ type: "push", merge_sha: string, branch_deleted: boolean }}
 */
export async function submitChanges(client, owner, repo, branch, opts) {
  const { strategy, target, reviewers = [], title, body } = opts;

  if (strategy === "pr") {
    const pr = await client.createPull(owner, repo, { head: branch, base: target, title, body });

    if (reviewers.length > 0) {
      const individualReviewers = reviewers.filter((r) => !r.startsWith("@"));
      const teamReviewers = reviewers
        .filter((r) => r.startsWith("@"))
        .map((r) => r.slice(1));
      await client.requestReviewers(owner, repo, pr.number, {
        reviewers: individualReviewers,
        team_reviewers: teamReviewers,
      });
    }

    return { type: "pr", number: pr.number, url: pr.html_url };
  }

  // strategy === "push"
  const mergeResult = await client.merge(owner, repo, target, branch);
  await client.deleteRef(owner, repo, `heads/${branch}`);

  return { type: "push", merge_sha: mergeResult.sha, branch_deleted: true };
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

server.registerTool(
  "read_artifacts",
  {
    title: "Read AIDOS Artifacts",
    description:
      "Read all files from a .aidos/ folder on a branch. Returns path, decoded content, and SHA for each file.",
    inputSchema: z.object({
      repo: z.string().describe("Repository as owner/repo"),
      branch: z.string().describe("Branch to read from"),
      path: z.string().describe("Path prefix to read (e.g. .aidos)"),
    }),
  },
  async ({ repo, branch, path }) => {
    const { client } = await getClient();
    const [owner, repoName] = repo.split("/");
    const result = await readArtifacts(client, owner, repoName, branch, path);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "save",
  {
    title: "Save AIDOS Artifacts",
    description:
      "Write files to a branch as a single atomic commit using the Git Trees API. All files are committed together with an [aidos] prefix on the message.",
    inputSchema: z.object({
      repo: z.string().describe("Repository as owner/repo"),
      branch: z.string().describe("Branch to commit to"),
      files: z
        .array(z.object({ path: z.string(), content: z.string() }))
        .describe("Files to write, each with path and content"),
      message: z.string().describe("Commit message (will be prefixed with [aidos])"),
    }),
  },
  async ({ repo, branch, files, message }) => {
    const { client } = await getClient();
    const [owner, repoName] = repo.split("/");
    const result = await saveArtifacts(client, owner, repoName, branch, files, message);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "diff",
  {
    title: "Diff AIDOS Branch",
    description:
      "Show .aidos/ file changes between a working branch and a target branch. Returns per-file patches and a summary of additions, deletions, and commits ahead.",
    inputSchema: z.object({
      repo: z.string().describe("Repository as owner/repo"),
      branch: z.string().describe("Working branch to diff"),
      target: z.string().describe("Target branch to compare against (e.g. main)"),
    }),
  },
  async ({ repo, branch, target }) => {
    const { client } = await getClient();
    const [owner, repoName] = repo.split("/");
    const result = await diffBranch(client, owner, repoName, branch, target);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "submit",
  {
    title: "Submit AIDOS Changes",
    description:
      "Submit working branch changes via pull request (pr) or direct merge and delete (push). For pr strategy, optional reviewers can be provided as logins; @-prefixed values are treated as team slugs.",
    inputSchema: z.object({
      repo: z.string().describe("Repository as owner/repo"),
      branch: z.string().describe("Working branch to submit"),
      target: z.string().describe("Target branch (e.g. main)"),
      strategy: z.enum(["pr", "push"]).describe("Submission strategy: pr or push"),
      reviewers: z
        .array(z.string())
        .default([])
        .describe("Reviewer logins for PR strategy (@ prefix for team slugs)"),
      title: z.string().optional().describe("PR title (pr strategy only)"),
      body: z.string().optional().describe("PR body (pr strategy only)"),
    }),
  },
  async ({ repo, branch, target, strategy, reviewers, title, body }) => {
    const { client } = await getClient();
    const [owner, repoName] = repo.split("/");
    const result = await submitChanges(client, owner, repoName, branch, {
      strategy,
      target,
      reviewers,
      title,
      body,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
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
