#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createClient } from "./github.js";
import { ensureAuth } from "./auth.js";
import { mapGitHubError } from "./errors.js";
import { validateManifest } from "./manifest.js";
import { detectConflicts, buildConflictPacket, resolveConflicts } from "./merge.js";
import { applyEdits } from "./edit.js";

const server = new McpServer({ name: "aidos-github", version: "1.2.0" });

const session = {
  client: null,
  login: null,
  token: null,
  workspace: null,
};

function textResult(text) {
  return { content: [{ type: "text", text }] };
}

async function requireAuth() {
  if (session.client && session.token) {
    return { authenticated: true, client: session.client, login: session.login };
  }
  const auth = await ensureAuth();
  if (!auth.authenticated) {
    return { authenticated: false, message: auth.message };
  }
  session.token = auth.token;
  session.login = auth.login;
  session.client = createClient(auth.token);
  return { authenticated: true, client: session.client, login: auth.login };
}

function clearAuth() {
  session.client = null;
  session.token = null;
  session.login = null;
}

function translateToolError(err, ctx = {}) {
  const { status, message } = mapGitHubError(err, ctx.op || "any", ctx);
  console.error(`[aidos-github] ${ctx.op || "tool"} failed: ${err?.message || err}`);
  if (status === 401) {
    clearAuth();
  }
  return message;
}

export function renderManifestStatus(folder) {
  const lines = ["Manifest status:"];
  if (!folder.manifest_present) {
    lines.push("  ✗ manifest.json is missing — I can create an empty one ({}).");
    return lines.join("\n");
  }
  if (folder.manifest_errors && folder.manifest_errors.length > 0) {
    lines.push("  ⚠ manifest.json has validation errors:");
    for (const e of folder.manifest_errors) lines.push(`    • ${e}`);
    return lines.join("\n");
  }
  lines.push("  ✓ manifest.json is valid");
  if (folder.publish_configured) {
    lines.push("  ✓ publish.confluence configured");
  } else {
    lines.push("  • publish.confluence: not configured (artifacts won't auto-publish to Confluence)");
  }
  return lines.join("\n");
}

export function renderWorkspaceStatus(workspace) {
  const lines = [];
  lines.push(`Workspace: ${workspace.repo}`);
  const branchSuffix = workspace.branch_created
    ? `(created from ${workspace.default_branch})`
    : `(synced with ${workspace.default_branch})`;
  lines.push(`Branch: ${workspace.branch} ${branchSuffix}`);

  if (workspace.work_in_progress) {
    lines.push("");
    lines.push(`You have work in progress: ${workspace.work_in_progress.ahead} commits ahead of ${workspace.default_branch}.`);
    for (const f of workspace.work_in_progress.files) {
      lines.push(`  • ${f.filename} (${f.status})`);
    }
    lines.push("");
    lines.push("Continue where you left off, or say 'start fresh' to reset the branch.");
  }

  if (workspace.sync_conflict) {
    lines.push("");
    lines.push(`⚠ ${workspace.sync_conflict.conflicts.length} file(s) conflict between the aidos branch and ${workspace.default_branch}.`);
    lines.push("  Call resolve with the returned conflict packet to apply resolutions.");
  }

  if (workspace.aidos_folders.length === 0) {
    lines.push("");
    lines.push("No .aidos/ folders found in this repo. Want me to create one? Where should it go?");
    lines.push("  • Repository root (.aidos/)");
    lines.push("  • Or specify a path");
    return lines.join("\n");
  }

  if (workspace.aidos_folders.length === 1) {
    const folder = workspace.aidos_folders[0];
    lines.push(`Artifacts folder: ${folder.path}/`);
    lines.push("");
    lines.push(renderManifestStatus(folder));
    if (workspace.rolling_pr) {
      lines.push("");
      lines.push(`Rolling PR #${workspace.rolling_pr.number} (${workspace.rolling_pr.state}): ${workspace.rolling_pr.url}`);
    }
    if (workspace.publish_status) {
      const ps = workspace.publish_status;
      const icon = ps.conclusion === "success" ? "✓" : ps.conclusion === "failure" ? "✗" : "•";
      const state = ps.conclusion || "in progress";
      lines.push("");
      lines.push(`Last publish (${ps.workflow}): ${icon} ${state} — ${ps.url}`);
    }
    lines.push("");
    lines.push("Ready to work. What would you like to do?");
  } else {
    lines.push("");
    lines.push(`Found ${workspace.aidos_folders.length} artifact folders:`);
    workspace.aidos_folders.forEach((f, i) => {
      const state = f.manifest_present ? (f.publish_configured ? "manifest + confluence configured" : "manifest only") : "no manifest";
      lines.push(`  ${i + 1}. ${f.path}/ — ${state}`);
    });
    lines.push("");
    lines.push("Which one do you want to work with? (number or path)");
  }
  return lines.join("\n");
}

/**
 * Resolve a GitHub workspace.
 *
 * Ensures the shared `aidos` branch exists (creating from default branch if
 * absent, syncing via merge from default if ahead), discovers .aidos/ folders,
 * and probes for the rolling PR `aidos → default_branch` + any confluence
 * publish workflow state. From v1.2.0 onward, the connector does not read
 * any manifest `write.*` config — the aidos.yml workflow owns strategy.
 *
 * @param {object} client - GitHub API client
 * @param {string} login - GitHub username (commit author only; no longer used for branching)
 * @param {string} repoFullName - "owner/repo"
 * @param {string|null} branchOverride - override branch name (default: "aidos")
 * @returns {object} workspace descriptor
 */
export async function resolveWorkspace(client, login, repoFullName, branchOverride) {
  const [owner, repo] = repoFullName.split("/");
  const repoInfo = await client.getRepo(owner, repo);
  const defaultBranch = repoInfo.default_branch;

  const branchName = branchOverride || "aidos";
  let branchCreated = false;
  let syncConflict = null;

  // Check if user branch exists
  let userBranchSha;
  try {
    const existing = await client.getBranch(owner, repo, branchName);
    userBranchSha = existing.commit.sha;
    // Branch exists — sync by merging default branch into user branch.
    try {
      await client.merge(owner, repo, branchName, defaultBranch, `Sync ${defaultBranch} into ${branchName}`);
    } catch (err) {
      const { status } = mapGitHubError(err, "merge");
      if (status === 409) {
        try {
          const detection = await detectConflicts(client, owner, repo, branchName, defaultBranch);
          if (detection.conflicts.length > 0) {
            syncConflict = await buildConflictPacket(client, owner, repo, detection);
          }
        } catch (inner) {
          console.error(`sync conflict probe failed: ${inner.message}`);
        }
      } else {
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

  // Probe for work in progress (only meaningful when branch already existed)
  let workInProgress = null;
  if (!branchCreated) {
    try {
      const cmp = await client.compare(owner, repo, defaultBranch, branchName);
      if ((cmp.ahead_by || 0) > 0) {
        workInProgress = {
          ahead: cmp.ahead_by,
          files: (cmp.files || [])
            .filter((f) => f.filename.includes(".aidos/"))
            .map((f) => ({ filename: f.filename, status: f.status })),
        };
      }
    } catch (err) {
      console.error(`compare failed for WIP detection: ${err.message}`);
    }
  }

  // Get full tree for the user branch
  const tree = await client.getTree(owner, repo, userBranchSha);

  // Find all .aidos/ folder paths by scanning tree entries
  const aidosFolderSet = new Set();
  for (const entry of tree.tree) {
    if (entry.type === "tree" && /(^|\/)\.aidos$/.test(entry.path)) {
      aidosFolderSet.add(entry.path);
    }
    const segMatch = entry.path.match(/^(.*?(?:^|\/)\.aidos)\//);
    if (segMatch) {
      aidosFolderSet.add(segMatch[1]);
    }
  }

  // For each .aidos/ folder, detect manifest presence, validate it, and note whether publish.confluence is configured.
  const aidosFolders = await Promise.all(
    Array.from(aidosFolderSet).map(async (folderPath) => {
      const manifestPath = `${folderPath}/manifest.json`;
      const manifestEntry = tree.tree.find(
        (e) => e.path === manifestPath && e.type === "blob",
      );

      const manifest_present = !!manifestEntry;
      let publish_configured = false;
      const manifest_errors = [];
      if (manifestEntry) {
        try {
          const blob = await client.getBlob(owner, repo, manifestEntry.sha);
          const content = Buffer.from(blob.content, blob.encoding || "base64").toString("utf8");
          const manifest = JSON.parse(content);
          const validation = validateManifest(manifest);
          if (!validation.valid) manifest_errors.push(...validation.errors);
          if (manifest.publish) publish_configured = true;
        } catch (err) {
          manifest_errors.push(`Couldn't parse manifest: ${err.message}`);
        }
      }

      return { path: folderPath, manifest_present, publish_configured, manifest_errors };
    }),
  );

  // Probe for the rolling PR `aidos → default_branch` (dashboard info only).
  let rollingPr = null;
  try {
    const prs = await client.listPulls(owner, repo, {
      state: "open",
      head: `${owner}:${branchName}`,
      base: defaultBranch,
    });
    const pr = (prs || [])[0];
    if (pr) rollingPr = { number: pr.number, url: pr.html_url, state: pr.state };
  } catch (err) {
    console.error(`Rolling PR lookup failed: ${err.message}`);
  }

  // Probe latest publish-workflow run for a dashboard status line.
  // Exclude aidos.yml — that's the rolling-PR maintainer, not a publish workflow.
  let publishStatus = null;
  try {
    const wfs = await client.listWorkflows(owner, repo);
    const wfList = wfs.workflows || [];
    const candidate = wfList.find((w) => {
      const path = w.path || "";
      const name = w.name || "";
      if (/aidos\.ya?ml/i.test(path) || /aidos-staging/i.test(path)) return false;
      return /confluence|publish/i.test(name) || /confluence|publish/i.test(path);
    });
    if (candidate) {
      const runs = await client.listWorkflowRuns(owner, repo, candidate.id);
      const latest = (runs.workflow_runs || [])[0];
      if (latest) {
        publishStatus = {
          workflow: candidate.name,
          conclusion: latest.conclusion,
          created_at: latest.created_at,
          url: latest.html_url,
        };
      }
    }
  } catch (err) {
    console.error(`publish status probe failed: ${err.message}`);
  }

  return {
    repo: repoFullName,
    branch: branchName,
    branch_created: branchCreated,
    default_branch: defaultBranch,
    aidos_folders: aidosFolders,
    work_in_progress: workInProgress,
    publish_status: publishStatus,
    rolling_pr: rollingPr,
    sync_conflict: syncConflict,
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
  await client.updateRef(owner, repo, branch, newCommit.sha);

  return { commit: newCommit.sha, files_changed: files.length };
}

/**
 * Fetch each file referenced in edits[] from the branch, apply its edits via
 * applyEdits, and commit the results atomically as a single commit.
 *
 * edits: Array<{ path, old_string, new_string, replace_all? }>
 *
 * Returns { commit: <sha>, files_changed: <n> } on success.
 * Throws Error with clean message on any failure (no partial commit).
 */
export async function editArtifacts(client, owner, repo, branch, edits, message) {
  if (!edits || edits.length === 0) {
    throw new Error("No edits provided.");
  }

  // Group edits by path, preserving order.
  const editsByPath = new Map();
  for (const edit of edits) {
    if (!editsByPath.has(edit.path)) editsByPath.set(edit.path, []);
    editsByPath.get(edit.path).push(edit);
  }

  const branchInfo = await client.getBranch(owner, repo, branch);
  const headSha = branchInfo.commit.sha;
  const tree = await client.getTree(owner, repo, headSha);

  const updatedFiles = [];
  for (const [path, pathEdits] of editsByPath) {
    const entry = tree.tree.find((e) => e.path === path && e.type === "blob");
    if (!entry) {
      throw new Error(`File not found on branch: ${path}. Use save() to create new files.`);
    }
    const blob = await client.getBlob(owner, repo, entry.sha);
    const content = Buffer.from(blob.content, blob.encoding || "base64").toString("utf8");
    const { newContent, error } = applyEdits(content, pathEdits);
    if (error) {
      throw new Error(`Edit failed for ${path}: ${error}`);
    }
    updatedFiles.push({ path, content: newContent });
  }

  const treeEntries = updatedFiles.map((f) => ({
    path: f.path,
    mode: "100644",
    type: "blob",
    content: f.content,
  }));

  const newTree = await client.createTree(owner, repo, tree.sha, treeEntries);
  const commitMessage = `[aidos] ${message}`;
  const newCommit = await client.createCommit(
    owner,
    repo,
    commitMessage,
    newTree.sha,
    [headSha],
  );
  await client.updateRef(owner, repo, branch, newCommit.sha);

  return { commit: newCommit.sha, files_changed: updatedFiles.length };
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
 * Apply conflict resolutions supplied by the caller and commit a two-parent
 * merge on `branch` that reconciles it with `target`. From v1.2.0 onward there
 * is no publish step after resolve — the workflow (aidos.yml) owns everything
 * downstream. Callers pass the merges echoed back from a previous conflict
 * packet plus the user's resolved content per file.
 */
export async function resolveAndSave(client, owner, repo, branch, opts) {
  const { target, merges } = opts;
  const resolveResult = await resolveConflicts(client, owner, repo, branch, target, merges);
  if (resolveResult.status === "conflict") {
    return resolveResult;
  }
  return { status: "resolved", commit: resolveResult.commit };
}

// ---- Repo resolution ----

export async function resolveRepo(client, query) {
  const q = query.trim();

  if (q.includes("/")) {
    const [owner, repo] = q.split("/");
    try {
      const info = await client.getRepo(owner, repo);
      return { status: "single", repo: info.full_name };
    } catch (err) {
      if (!/404/.test(err.message)) throw err;
      return { status: "none", matches: [] };
    }
  }

  const lower = q.toLowerCase();

  try {
    const repos = await client.listUserRepos();
    const matches = repos
      .map((r) => r.full_name)
      .filter((name) => name.toLowerCase().split("/")[1]?.includes(lower));
    if (matches.length === 1) return { status: "single", repo: matches[0] };
    if (matches.length > 1) return { status: "multiple", matches };
  } catch (err) {
    console.error(`listUserRepos failed: ${err.message}`);
  }

  try {
    const search = await client.searchRepos(q);
    const items = search.items || [];
    if (items.length === 0) return { status: "none", matches: [] };
    if (items.length === 1) return { status: "single", repo: items[0].full_name };
    return { status: "multiple", matches: items.map((i) => i.full_name) };
  } catch {
    return { status: "none", matches: [] };
  }
}

// ---- Tool registration ----

server.registerTool(
  "open_workspace",
  {
    title: "Open AIDOS Workspace",
    description:
      "Resolve a GitHub repo, ensure the shared `aidos` branch exists (creating from the default branch if absent; merging in default when it advances), and discover .aidos/ folders. Probes the rolling PR `aidos → default_branch` and any configured Confluence publish workflow for dashboard status. The connector does not read manifest write config — the aidos.yml workflow owns strategy from v1.2.0 onward.",
    inputSchema: z.object({
      query: z.string().describe("Repository name or org/repo"),
      branch: z.string().optional().describe("Override branch name (default: \"aidos\")"),
    }),
  },
  async ({ query, branch }) => {
    const auth = await requireAuth();
    if (!auth.authenticated) return textResult(auth.message);

    try {
      const resolved = await resolveRepo(auth.client, query);
      if (resolved.status === "none") {
        return textResult(`No repos found matching '${query}'. Check that your GitHub account has access to the repo's organisation. You might need the full name like 'your-org/${query}'.`);
      }
      if (resolved.status === "multiple") {
        const list = resolved.matches.map((m) => `  • ${m}`).join("\n");
        return textResult(`Found ${resolved.matches.length} repos matching '${query}':\n${list}\n\nWhich one do you want to work with? (give me the full org/repo name)`);
      }

      const repoFullName = resolved.repo;
      const workspace = await resolveWorkspace(auth.client, auth.login, repoFullName, branch || null);
      session.workspace = workspace;
      if (workspace.aidos_folders.length === 1) {
        session.workspace.selected_path = workspace.aidos_folders[0].path;
      } else {
        session.workspace.selected_path = null;
      }

      return textResult(renderWorkspaceStatus(workspace));
    } catch (err) {
      return textResult(translateToolError(err, { op: "open_workspace", query }));
    }
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
    const auth = await requireAuth();
    if (!auth.authenticated) return textResult(auth.message);
    try {
      const [owner, repoName] = repo.split("/");
      const result = await readArtifacts(auth.client, owner, repoName, branch, path);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return textResult(translateToolError(err, { op: "read_artifacts" }));
    }
  },
);

server.registerTool(
  "save",
  {
    title: "Save AIDOS Artifacts",
    description:
      "Preview or commit files to a branch. Default returns a preview; call again with confirm=true to actually commit as a single atomic commit (prefixed [aidos]).",
    inputSchema: z.object({
      repo: z.string().describe("Repository as owner/repo"),
      branch: z.string().describe("Branch to commit to"),
      files: z
        .array(z.object({ path: z.string(), content: z.string() }))
        .describe("Files to write, each with path and content"),
      message: z.string().describe("Commit message (will be prefixed with [aidos])"),
      confirm: z.boolean().default(false).describe("Set true to commit; false returns a preview"),
    }),
  },
  async ({ repo, branch, files, message, confirm }) => {
    const auth = await requireAuth();
    if (!auth.authenticated) return textResult(auth.message);
    const [owner, repoName] = repo.split("/");
    try {
      if (!confirm) {
        if (!files || files.length === 0) {
          return textResult("Nothing to save (empty file list).");
        }
        const lines = [`Ready to commit to ${branch}:`, ""];
        for (const f of files) {
          const lineCount = f.content.split("\n").length;
          lines.push(`  • ${f.path} (${lineCount} lines)`);
        }
        lines.push("");
        lines.push(`Commit message: "${message}"`);
        lines.push("");
        lines.push("Call save again with confirm=true to commit.");
        return textResult(lines.join("\n"));
      }
      const result = await saveArtifacts(auth.client, owner, repoName, branch, files, message);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return textResult(translateToolError(err, { op: "save" }));
    }
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
    const auth = await requireAuth();
    if (!auth.authenticated) return textResult(auth.message);
    try {
      const [owner, repoName] = repo.split("/");
      const result = await diffBranch(auth.client, owner, repoName, branch, target);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return textResult(translateToolError(err, { op: "diff" }));
    }
  },
);

server.registerTool(
  "resolve",
  {
    title: "Resolve AIDOS Branch Conflicts",
    description:
      "Apply user-supplied conflict resolutions and commit a two-parent merge on the aidos branch that reconciles it with the repo's default branch. From v1.2.0 onward there is no publish step after resolve — the aidos.yml workflow handles everything downstream. Use this when open_workspace reports a sync_conflict, or after the connector returns a conflict packet during an earlier save. If the default branch drifted since the packet was generated, a fresh packet is returned — present the new state to the user and call resolve again with updated resolutions.",
    inputSchema: z.object({
      repo: z.string().describe("Repository as owner/repo"),
      branch: z.string().describe("The aidos branch (use \"aidos\" unless your workspace overrode it)"),
      target: z.string().describe("The repo's default branch (e.g. 'main' / 'develop'). Source it from open_workspace's default_branch output."),
      merges: z.array(
        z.object({
          path: z.string(),
          original: z.object({
            base: z.string(),
            theirs: z.string(),
            yours: z.string(),
          }),
          resolved: z.string(),
        }),
      ).describe("Per-file resolutions; each original block must be echoed verbatim from the conflict packet that produced it"),
    }),
  },
  async ({ repo, branch, target, merges }) => {
    const auth = await requireAuth();
    if (!auth.authenticated) return textResult(auth.message);
    const [owner, repoName] = repo.split("/");
    try {
      const result = await resolveAndSave(auth.client, owner, repoName, branch, { target, merges });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return textResult(translateToolError(err, { op: "resolve", target }));
    }
  },
);

server.registerTool(
  "edit",
  {
    title: "Edit AIDOS Artifacts",
    description:
      "Surgical edits to existing files on a branch. For each edit, supply the exact old_string currently in the file and the new_string to replace it with. Edits across multiple files are committed as a single atomic commit. Use this instead of save() whenever making partial changes — it is faster and preserves file content the agent didn't intend to change. Always read_artifacts first so old_string matches exactly. Multiple edits targeting the same path are applied sequentially; a later edit sees the result of earlier ones. Set replace_all: true if old_string appears more than once and you want every occurrence replaced.",
    inputSchema: z.object({
      repo: z.string().describe("Repository as owner/repo"),
      branch: z.string().describe("Branch to commit to"),
      edits: z.array(
        z.object({
          path: z.string().describe("File path relative to repo root"),
          old_string: z.string().describe("Exact text to replace (must be present in the current file)"),
          new_string: z.string().describe("Replacement text"),
          replace_all: z.boolean().default(false).describe("Replace every occurrence instead of exactly one"),
        }),
      ).describe("Per-file edits; multiple edits to the same path apply sequentially"),
      message: z.string().describe("Commit message (will be prefixed with [aidos])"),
    }),
  },
  async ({ repo, branch, edits, message }) => {
    const auth = await requireAuth();
    if (!auth.authenticated) return textResult(auth.message);
    const [owner, repoName] = repo.split("/");
    try {
      const result = await editArtifacts(auth.client, owner, repoName, branch, edits, message);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return textResult(translateToolError(err, { op: "edit" }));
    }
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
