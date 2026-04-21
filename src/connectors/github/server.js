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

const server = new McpServer({ name: "aidos-github", version: "1.0.2" });

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
    lines.push("  ✗ manifest.json is missing — I can create a default one. What's the target branch for PRs? (usually 'main')");
    return lines.join("\n");
  }
  if (folder.manifest_errors && folder.manifest_errors.length > 0) {
    lines.push("  ⚠ manifest.json has validation errors:");
    for (const e of folder.manifest_errors) lines.push(`    • ${e}`);
    return lines.join("\n");
  }
  const w = folder.write || {};
  if (w.strategy) lines.push(`  ✓ write.strategy: ${w.strategy} (PRs will target ${w.target})`);
  else lines.push("  ⚠ No write config — Publish will default to PR against main.");
  if (w.reviewers && w.reviewers.length) lines.push(`  ✓ write.reviewers: ${w.reviewers.join(", ")}`);
  if (folder.publish_configured) {
    lines.push("  ✓ publish.confluence configured");
  } else {
    lines.push("  ✗ publish.confluence: not configured (artifacts won't auto-publish to Confluence on merge)");
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
    lines.push(`⚠ ${workspace.sync_conflict.conflicts.length} file(s) conflict between your branch and ${workspace.default_branch}.`);
    lines.push("  Call publish to get the full conflict packet, then resolve to apply your choices.");
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
      const target = f.write?.target || workspace.default_branch;
      const strategy = f.write?.strategy || "pr";
      const manifestState = f.manifest_present ? `write: ${strategy} → ${target}` : "no manifest";
      lines.push(`  ${i + 1}. ${f.path}/ — ${manifestState}`);
    });
    lines.push("");
    lines.push("Which one do you want to work with? (number or path)");
  }
  return lines.join("\n");
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
          if (manifest.write) write = { ...defaultWrite, ...manifest.write };
          if (manifest.publish) publish_configured = true;
        } catch (err) {
          manifest_errors.push(`Couldn't parse manifest: ${err.message}`);
        }
      }

      return { path: folderPath, write, manifest_present, publish_configured, manifest_errors };
    }),
  );

  let publishStatus = null;
  try {
    const workflows = await client.listWorkflows(owner, repo);
    const wfList = workflows.workflows || [];
    const candidate = wfList.find((w) =>
      /aidos|confluence|publish/i.test(w.name || "") || /aidos|confluence|publish/i.test(w.path || "")
    );
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
 * Publish changes via PR, direct push/merge, or staged merge.
 *
 * @param {object} client - GitHub API client
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} branch - Working branch to publish
 * @param {object} opts
 * @param {string} opts.strategy - "pr" | "push" | "staged"
 * @param {string} opts.target - Target branch. For pr/push: final merge target (e.g. main). For staged: staging branch (e.g. aidos)
 * @param {string[]} [opts.reviewers] - Reviewer logins (@ prefix treated as team). Ignored for staged — the shipped workflow requests reviewers on the rolling PR
 * @param {string} [opts.title] - PR title (pr strategy only)
 * @param {string} [opts.body] - PR body (pr strategy only)
 * @returns {{ type: "pr", number: number, url: string }|{ type: "push", merge_sha: string, branch_deleted: boolean }|{ type: "staged", merge_sha: string, branch_deleted: boolean }}
 */
export async function publishChanges(client, owner, repo, branch, opts) {
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

  if (strategy === "staged") {
    const mergeResult = await client.merge(owner, repo, target, branch);
    await client.deleteRef(owner, repo, branch);
    return { type: "staged", merge_sha: mergeResult.sha, branch_deleted: true };
  }

  // strategy === "push"
  const mergeResult = await client.merge(owner, repo, target, branch);
  await client.deleteRef(owner, repo, branch);

  return { type: "push", merge_sha: mergeResult.sha, branch_deleted: true };
}

/**
 * Resolve conflicts and complete the publish in one call.
 *
 * Wraps resolveConflicts (which handles staleness and new-conflict detection)
 * and, on successful merge commit, invokes publishChanges to open the PR or
 * push-merge per the manifest write config.
 */
export async function resolveConflictsAndPublish(client, owner, repo, branch, opts) {
  const { target, strategy, reviewers, title, body, merges } = opts;

  const resolveResult = await resolveConflicts(client, owner, repo, branch, target, merges);
  if (resolveResult.status === "conflict") {
    return resolveResult;
  }

  const publishResult = await publishChanges(client, owner, repo, branch, {
    strategy, target, reviewers, title, body,
  });

  return { status: "resolved", commit: resolveResult.commit, ...publishResult };
}

// ---- Pre-flight ----

export async function preflightPublish(client, owner, repo, branch, opts) {
  const { target, reviewers = [] } = opts;
  const checks = [];

  try {
    await client.getBranch(owner, repo, target);
    checks.push({ name: "target_branch", pass: true, message: `Target branch '${target}' exists` });
  } catch {
    checks.push({ name: "target_branch", pass: false, message: `Target branch '${target}' not found` });
  }

  try {
    const cmp = await client.compare(owner, repo, target, branch);
    const behind = cmp.behind_by || 0;
    if (behind > 0) {
      const detection = await detectConflicts(client, owner, repo, branch, target);
      if (detection.conflicts.length > 0) {
        const packet = await buildConflictPacket(client, owner, repo, detection);
        checks.push({
          name: "conflicts",
          pass: false,
          message: `Branch is ${behind} commit(s) behind ${target} with ${detection.conflicts.length} conflicting file(s).`,
        });
        return { ok: false, checks, conflict_packet: packet };
      }
      checks.push({
        name: "conflicts",
        pass: true,
        message: `Branch is behind by ${behind} but no conflicts — merge will be clean at confirm time.`,
      });
    } else {
      checks.push({ name: "conflicts", pass: true, message: `No conflicts with ${target}` });
    }
  } catch (err) {
    checks.push({ name: "conflicts", pass: false, message: `Couldn't check conflicts: ${err.message}` });
  }

  for (const r of reviewers) {
    if (r.startsWith("@")) {
      const body = r.slice(1);
      const [orgSlug, teamSlug] = body.includes("/") ? body.split("/") : [owner, body];
      try {
        await client.lookupTeam(orgSlug, teamSlug);
        checks.push({ name: "reviewers", pass: true, message: `Reviewer ${r} resolved to team ${orgSlug}/${teamSlug}` });
      } catch {
        checks.push({ name: "reviewers", pass: false, message: `Reviewer team '${r}' not found` });
      }
    } else {
      try {
        await client.lookupUser(r);
        checks.push({ name: "reviewers", pass: true, message: `Reviewer '${r}' exists` });
      } catch {
        checks.push({ name: "reviewers", pass: false, message: `Reviewer '${r}' is not a valid GitHub user` });
      }
    }
  }

  return { ok: checks.every((c) => c.pass), checks };
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
      "Resolve a GitHub repo, ensure the user's aidos/ working branch exists, and discover .aidos/ folders with their write configuration.",
    inputSchema: z.object({
      query: z.string().describe("Repository name or org/repo"),
      branch: z.string().optional().describe("Override branch name (default: aidos/{username})"),
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
  "publish",
  {
    title: "Publish AIDOS Changes",
    description:
      "Preflight and publish working branch changes. Strategy options: 'pr' (open a pull request to target), 'push' (direct merge into target), or 'staged' (merge into a persistent staging branch that has a rolling PR to the final target — the AI skill reads the manifest and passes target=staging_branch in this mode). If the target branch has diverged and the merge would conflict, returns a structured conflict packet with base/theirs/yours content per file — follow up with the resolve tool after walking the user through the conflicts. Set confirm=true to execute after reviewing the preflight.",
    inputSchema: z.object({
      repo: z.string().describe("Repository as owner/repo"),
      branch: z.string().describe("Working branch to publish"),
      target: z.string().describe("Target branch (e.g. main)"),
      strategy: z.enum(["pr", "push", "staged"]).describe("Publication strategy: pr, push, or staged"),
      reviewers: z.array(z.string()).default([]).describe("Reviewer logins (@ prefix for team slugs)"),
      title: z.string().optional().describe("PR title (pr strategy only)"),
      body: z.string().optional().describe("PR body (pr strategy only)"),
      confirm: z.boolean().default(false).describe("Set true to execute after reviewing preflight"),
    }),
  },
  async ({ repo, branch, target, strategy, reviewers, title, body, confirm }) => {
    const auth = await requireAuth();
    if (!auth.authenticated) return textResult(auth.message);
    const [owner, repoName] = repo.split("/");

    try {
      const pre = await preflightPublish(auth.client, owner, repoName, branch, { strategy, target, reviewers });
      if (!pre.ok) {
        if (pre.conflict_packet) {
          return { content: [{ type: "text", text: JSON.stringify(pre.conflict_packet, null, 2) }] };
        }
        return textResult(
          "Pre-flight found issues:\n\n" +
          pre.checks.map((c) => `${c.pass ? "✓" : "✗"} ${c.message}`).join("\n") +
          "\n\nFix these before publishing."
        );
      }
      if (!confirm) {
        return textResult(
          "Pre-flight check for publish:\n\n" +
          pre.checks.map((c) => `✓ ${c.message}`).join("\n") +
          "\n\nCall publish again with confirm=true to proceed."
        );
      }
      const result = await publishChanges(auth.client, owner, repoName, branch, {
        strategy, target, reviewers, title, body,
      });
      if (result.type === "pr") {
        return textResult(`Created PR #${result.number}: ${result.url}`);
      }
      return textResult(`Merged branch ${branch} into ${target} (commit ${result.merge_sha}). Branch deleted.`);
    } catch (err) {
      return textResult(translateToolError(err, { op: "publish", target }));
    }
  },
);

server.registerTool(
  "resolve",
  {
    title: "Resolve AIDOS Publish Conflicts",
    description:
      "Apply conflict resolutions returned by publish(). Takes an array of merge packets, each with the original base/theirs/yours echoed back verbatim from publish's response and the user's resolved content. Validates staleness (rejects if the target's content for a conflicting file changed since the packet was issued), checks for newly-conflicting paths not in the incoming merges, and on success commits a two-parent merge commit and performs the publish action (pr, push, or staged). If the target drifted or a new conflict appeared, returns a fresh conflict packet — present the new state to the user and call resolve again with updated resolutions.",
    inputSchema: z.object({
      repo: z.string().describe("Repository as owner/repo"),
      branch: z.string().describe("Working branch"),
      target: z.string().describe("Target branch (e.g. main)"),
      strategy: z.enum(["pr", "push", "staged"]).describe("Publication strategy: pr, push, or staged"),
      reviewers: z.array(z.string()).default([]).describe("Reviewer logins (@ prefix for team slugs)"),
      title: z.string().optional(),
      body: z.string().optional(),
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
      ).describe("Per-file resolutions; original block must be echoed verbatim from publish()'s response"),
    }),
  },
  async ({ repo, branch, target, strategy, reviewers, title, body, merges }) => {
    const auth = await requireAuth();
    if (!auth.authenticated) return textResult(auth.message);
    const [owner, repoName] = repo.split("/");
    try {
      const result = await resolveConflictsAndPublish(auth.client, owner, repoName, branch, {
        target, strategy, reviewers, title, body, merges,
      });
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
