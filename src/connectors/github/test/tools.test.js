import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveWorkspace, readArtifacts, saveArtifacts, diffBranch, resolveAndSave, editArtifacts } from "../server.js";

function mockClient(overrides = {}) {
  const defaults = {
    getUser: async () => ({ login: "simon" }),
    searchRepos: async () => ({ items: [{ full_name: "org/my-repo", default_branch: "main" }] }),
    getRepo: async (o, r) => ({ full_name: `${o}/${r}`, default_branch: "main" }),
    getBranch: async () => { throw new Error("GitHub API 404"); },
    createBranch: async () => ({ ref: "refs/heads/aidos" }),
    getTree: async () => ({
      sha: "root",
      tree: [
        { path: ".aidos/problem.md", type: "blob", sha: "aaa" },
        { path: ".aidos/manifest.json", type: "blob", sha: "bbb" },
        { path: "src/index.js", type: "blob", sha: "ccc" },
      ],
    }),
    getBlob: async () => ({
      content: Buffer.from(JSON.stringify({})).toString("base64"),
      encoding: "base64",
    }),
    merge: async () => ({}),
    compare: async () => ({ ahead_by: 0, files: [] }),
    listWorkflows: async () => ({ workflows: [] }),
    listWorkflowRuns: async () => ({ workflow_runs: [] }),
    listPulls: async () => [],
  };
  return { ...defaults, ...overrides };
}

describe("resolveWorkspace", () => {
  it("creates the aidos branch when it does not exist", async () => {
    const client = mockClient({
      getBranch: async (owner, repo, branch) => {
        if (branch === "aidos") {
          throw new Error("GitHub API 404");
        }
        return { commit: { sha: "abc123" }, name: branch };
      },
    });

    const result = await resolveWorkspace(client, "simon", "org/my-repo", null);

    assert.equal(result.branch, "aidos");
    assert.equal(result.branch_created, true);
    assert.equal(result.default_branch, "main");
    assert.equal(result.repo, "org/my-repo");
  });

  it("syncs the existing aidos branch by merging default into it", async () => {
    let mergeCalled = false;
    const client = mockClient({
      getBranch: async () => ({ commit: { sha: "abc123" }, name: "aidos" }),
      merge: async () => {
        mergeCalled = true;
        return {};
      },
    });

    const result = await resolveWorkspace(client, "simon", "org/my-repo", null);

    assert.equal(result.branch_created, false);
    assert.equal(result.branch, "aidos");
    assert.ok(mergeCalled, "merge should be called to sync existing aidos branch");
  });

  it("discovers .aidos/ folders without reading write config", async () => {
    const client = mockClient({
      getBranch: async (owner, repo, branch) => ({ commit: { sha: "abc123" }, name: branch }),
    });

    const result = await resolveWorkspace(client, "simon", "org/my-repo", null);

    assert.equal(result.aidos_folders.length, 1);
    assert.equal(result.aidos_folders[0].path, ".aidos");
    assert.equal(result.aidos_folders[0].manifest_present, true);
    assert.equal(result.aidos_folders[0].publish_configured, false);
    assert.ok(!("write" in result.aidos_folders[0]), "write field should not appear on folder");
  });

  it("discovers multiple .aidos/ folders in monorepo", async () => {
    const client = mockClient({
      getBranch: async (owner, repo, branch) => ({ commit: { sha: "abc123" }, name: branch }),
      getTree: async () => ({
        sha: "root",
        tree: [
          { path: ".aidos/problem.md", type: "blob", sha: "aaa" },
          { path: ".aidos/manifest.json", type: "blob", sha: "bbb" },
          { path: "services/auth/.aidos/problem.md", type: "blob", sha: "ccc" },
          { path: "services/auth/.aidos/manifest.json", type: "blob", sha: "ddd" },
          { path: "src/index.js", type: "blob", sha: "eee" },
        ],
      }),
    });

    const result = await resolveWorkspace(client, "simon", "org/my-repo", null);

    assert.equal(result.aidos_folders.length, 2);
    const paths = result.aidos_folders.map((f) => f.path);
    assert.ok(paths.includes(".aidos"));
    assert.ok(paths.includes("services/auth/.aidos"));
  });

  it("surfaces .aidos/ folders without a manifest as tree entries", async () => {
    const client = mockClient({
      getBranch: async (owner, repo, branch) => ({ commit: { sha: "abc123" }, name: branch }),
      getTree: async () => ({
        sha: "root",
        tree: [
          { path: ".aidos", type: "tree", sha: "tree1" },
          { path: "src/index.js", type: "blob", sha: "eee" },
        ],
      }),
    });

    const result = await resolveWorkspace(client, "simon", "org/my-repo", null);
    const folder = result.aidos_folders.find((f) => f.path === ".aidos");
    assert.ok(folder, ".aidos/ should be discovered even without manifest");
    assert.equal(folder.manifest_present, false);
  });

  it("reports work in progress when aidos is ahead of default", async () => {
    const client = mockClient({
      getBranch: async () => ({ commit: { sha: "abc123" }, name: "aidos" }),
      compare: async () => ({
        ahead_by: 3,
        files: [
          { filename: ".aidos/problem.md", status: "modified" },
          { filename: ".aidos/solution.md", status: "added" },
        ],
      }),
    });
    const result = await resolveWorkspace(client, "simon", "org/my-repo", null);
    assert.ok(result.work_in_progress, "should detect WIP");
    assert.equal(result.work_in_progress.ahead, 3);
    assert.equal(result.work_in_progress.files.length, 2);
  });

  it("populates rolling_pr when a PR aidos → default is open", async () => {
    const client = mockClient({
      getBranch: async () => ({ commit: { sha: "abc" }, name: "aidos" }),
      listPulls: async () => [
        { number: 77, html_url: "https://github.com/org/my-repo/pull/77", state: "open" },
      ],
    });

    const result = await resolveWorkspace(client, "simon", "org/my-repo", null);
    assert.ok(result.rolling_pr);
    assert.equal(result.rolling_pr.number, 77);
    assert.equal(result.rolling_pr.state, "open");
  });

  it("rolling_pr is null when no open PR exists", async () => {
    const client = mockClient({
      getBranch: async () => ({ commit: { sha: "abc" }, name: "aidos" }),
      listPulls: async () => [],
    });

    const result = await resolveWorkspace(client, "simon", "org/my-repo", null);
    assert.equal(result.rolling_pr, null);
  });

  it("surfaces last confluence-publish workflow run when available", async () => {
    const client = mockClient({
      getBranch: async () => ({ commit: { sha: "abc" }, name: "aidos" }),
      listWorkflows: async () => ({ workflows: [{ id: 42, name: "Publish to Confluence", path: ".github/workflows/confluence-publish.yml" }] }),
      listWorkflowRuns: async (o, r, wid) => {
        assert.equal(wid, 42);
        return { workflow_runs: [{ id: 100, conclusion: "success", created_at: "2026-04-15T10:00:00Z", html_url: "https://github.com/org/my-repo/actions/runs/100" }] };
      },
    });

    const result = await resolveWorkspace(client, "simon", "org/my-repo", null);
    assert.ok(result.publish_status);
    assert.equal(result.publish_status.workflow, "Publish to Confluence");
    assert.equal(result.publish_status.conclusion, "success");
  });

  it("excludes aidos.yml from publish-status candidate workflows", async () => {
    const client = mockClient({
      getBranch: async () => ({ commit: { sha: "abc" }, name: "aidos" }),
      listWorkflows: async () => ({
        workflows: [
          { id: 1, name: "AIDOS Branch Lifecycle", path: ".github/workflows/aidos.yml" },
        ],
      }),
    });

    const result = await resolveWorkspace(client, "simon", "org/my-repo", null);
    assert.equal(result.publish_status, null, "aidos.yml is infrastructure, not a publish workflow");
  });

  it("does not match paths where .aidos is a segment suffix (not its own segment)", async () => {
    const client = mockClient({
      getBranch: async () => ({ commit: { sha: "abc" }, name: "aidos" }),
      getTree: async () => ({
        sha: "root",
        tree: [
          { path: "not.aidos/file.md", type: "blob", sha: "aaa" },
          { path: "my.aidos/data.json", type: "blob", sha: "bbb" },
          { path: ".aidos/real.md", type: "blob", sha: "ccc" },
        ],
      }),
    });

    const result = await resolveWorkspace(client, "simon", "org/my-repo", null);
    const paths = result.aidos_folders.map((f) => f.path);
    assert.deepEqual(paths, [".aidos"]);
  });

  it("attaches a conflict packet when sync merge hits 409", async () => {
    const client = mockClient({
      getBranch: async (o, r, b) => ({ commit: { sha: b === "main" ? "m1" : "b1" }, name: b }),
      merge: async () => { throw new Error("GitHub API 409: merge conflict"); },
      compare: async () => ({
        merge_base_commit: { sha: "base-sha" },
        ahead_by: 1, behind_by: 2,
      }),
      getTree: async (o, r, sha) => {
        if (sha === "base-sha") return { tree: [{ path: "x.md", type: "blob", sha: "x0" }]};
        if (sha === "m1")       return { tree: [{ path: "x.md", type: "blob", sha: "xm" }]};
        if (sha === "b1")       return { tree: [
          { path: "x.md", type: "blob", sha: "xb" },
          { path: ".aidos/manifest.json", type: "blob", sha: "bbb" },
        ]};
        return { tree: [] };
      },
      getBlob: async (o, r, sha) => {
        const map = { "x0": "BASE", "xm": "MAIN", "xb": "BRANCH" };
        if (map[sha]) return { content: Buffer.from(map[sha]).toString("base64"), encoding: "base64" };
        return { content: Buffer.from(JSON.stringify({})).toString("base64"), encoding: "base64" };
      },
    });

    const result = await resolveWorkspace(client, "simon", "org/my-repo", null);

    assert.ok(result.sync_conflict, "workspace must include sync_conflict when 409 hit");
    assert.equal(result.sync_conflict.status, "conflict");
    assert.equal(result.sync_conflict.conflicts[0].path, "x.md");
  });
});

describe("readArtifacts", () => {
  it("returns all files from .aidos/ folder", async () => {
    const client = mockClient({
      getBranch: async () => ({ commit: { sha: "head123" }, name: "aidos" }),
      getTree: async () => ({
        sha: "root",
        tree: [
          { path: ".aidos/problem.md", type: "blob", sha: "sha1" },
          { path: ".aidos/solution.md", type: "blob", sha: "sha2" },
          { path: ".aidos/manifest.json", type: "blob", sha: "sha3" },
          { path: ".aidos/feature-auth/feature-auth.md", type: "blob", sha: "sha4" },
          { path: "src/index.js", type: "blob", sha: "sha5" },
        ],
      }),
      getBlob: async (owner, repo, sha) => ({
        content: Buffer.from(`content of ${sha}`).toString("base64"),
        encoding: "base64",
      }),
    });

    const result = await readArtifacts(client, "org", "my-repo", "aidos", ".aidos");

    assert.equal(result.files.length, 4);
    const paths = result.files.map((f) => f.path);
    assert.ok(paths.includes(".aidos/problem.md"));
    assert.ok(paths.includes(".aidos/solution.md"));
    assert.ok(paths.includes(".aidos/manifest.json"));
    assert.ok(paths.includes(".aidos/feature-auth/feature-auth.md"));
    assert.ok(!paths.includes("src/index.js"));

    for (const file of result.files) {
      assert.ok(file.path);
      assert.ok(file.content);
      assert.ok(file.sha);
    }
  });

  it("returns empty array for folder with no files", async () => {
    const client = mockClient({
      getBranch: async () => ({ commit: { sha: "head123" }, name: "aidos" }),
      getTree: async () => ({ sha: "root", tree: [] }),
    });

    const result = await readArtifacts(client, "org", "my-repo", "aidos", ".aidos");
    assert.equal(result.files.length, 0);
  });
});

describe("saveArtifacts", () => {
  it("creates atomic commit with all files on the aidos branch", async () => {
    let createTreeArgs;
    let createCommitArgs;
    let updateRefArgs;

    const client = mockClient({
      getBranch: async () => ({ commit: { sha: "head123" }, name: "aidos" }),
      getTree: async () => ({ sha: "root-tree-sha", tree: [] }),
      createTree: async (owner, repo, baseSha, treeEntries) => {
        createTreeArgs = { owner, repo, baseSha, treeEntries };
        return { sha: "new-tree-sha" };
      },
      createCommit: async (owner, repo, message, treeSha, parentShas) => {
        createCommitArgs = { owner, repo, message, treeSha, parentShas };
        return { sha: "new-commit-sha" };
      },
      updateRef: async (owner, repo, ref, sha) => {
        updateRefArgs = { owner, repo, ref, sha };
        return {};
      },
    });

    const files = [
      { path: ".aidos/problem.md", content: "# Problem" },
      { path: ".aidos/solution.md", content: "# Solution" },
    ];

    const result = await saveArtifacts(client, "org", "my-repo", "aidos", files, "update docs");

    assert.ok(createTreeArgs);
    assert.equal(createTreeArgs.treeEntries.length, 2);
    assert.equal(createTreeArgs.treeEntries[0].mode, "100644");
    assert.equal(createTreeArgs.treeEntries[0].type, "blob");

    assert.ok(createCommitArgs);
    assert.ok(createCommitArgs.message.startsWith("[aidos]"));

    assert.ok(updateRefArgs);
    assert.equal(updateRefArgs.ref, "aidos", "ref update must target the aidos branch");
    assert.equal(updateRefArgs.sha, "new-commit-sha");

    assert.equal(result.commit, "new-commit-sha");
    assert.equal(result.files_changed, 2);
  });

  it("skips commit when no files provided", async () => {
    const client = mockClient();
    const result = await saveArtifacts(client, "org", "my-repo", "aidos", [], "empty");
    assert.equal(result.commit, null);
    assert.equal(result.message, "Nothing to save");
    assert.equal(result.files_changed, 0);
  });
});

describe("diffBranch", () => {
  it("returns changed .aidos/ files with patches", async () => {
    const client = mockClient({
      compare: async () => ({
        files: [
          { filename: ".aidos/problem.md", status: "modified", additions: 5, deletions: 2, patch: "@@ -1 +1 @@\n-old\n+new" },
          { filename: ".aidos/solution.md", status: "added", additions: 10, deletions: 0, patch: "@@ -0,0 +1,10 @@\n+content" },
          { filename: "src/index.js", status: "modified", additions: 1, deletions: 1, patch: "@@ -1 +1 @@\n-x\n+y" },
        ],
        ahead_by: 2,
      }),
    });

    const result = await diffBranch(client, "org", "my-repo", "aidos", "main");

    assert.equal(result.files.length, 2);
    assert.ok(result.files.every((f) => f.filename.includes(".aidos/")));
    assert.equal(result.summary.files_changed, 2);
    assert.equal(result.summary.additions, 15);
    assert.equal(result.summary.deletions, 2);
    assert.equal(result.summary.commits_ahead, 2);
  });

  it("returns empty diff when no changes", async () => {
    const client = mockClient({
      compare: async () => ({ files: [], ahead_by: 0 }),
    });
    const result = await diffBranch(client, "org", "my-repo", "aidos", "main");
    assert.equal(result.files.length, 0);
    assert.equal(result.summary.files_changed, 0);
    assert.equal(result.summary.commits_ahead, 0);
  });
});

describe("resolveAndSave", () => {
  it("commits the two-parent merge and returns resolved status", async () => {
    const client = {
      compare: async () => ({ merge_base_commit: { sha: "base-sha" } }),
      getBranch: async (o, r, b) => ({ commit: { sha: b === "main" ? "main-sha" : "branch-sha" } }),
      getTree: async (o, r, sha) => {
        if (sha === "base-sha")   return { tree: [{ path: "a.md", type: "blob", sha: "a-base" }]};
        if (sha === "main-sha")   return { tree: [{ path: "a.md", type: "blob", sha: "a-main" }]};
        if (sha === "branch-sha") return { tree: [{ path: "a.md", type: "blob", sha: "a-branch" }]};
        return { tree: [] };
      },
      getBlob: async (o, r, sha) => {
        const map = { "a-base": "BASE", "a-main": "MAIN", "a-branch": "BRANCH" };
        return { content: Buffer.from(map[sha] || "").toString("base64"), encoding: "base64" };
      },
      createTree: async () => ({ sha: "new-tree" }),
      createCommit: async () => ({ sha: "merge-commit" }),
      updateRef: async () => ({}),
    };

    const result = await resolveAndSave(client, "org", "repo", "aidos", {
      target: "main",
      merges: [{
        path: "a.md",
        original: { base: "BASE", theirs: "MAIN", yours: "BRANCH" },
        resolved: "RESOLVED",
      }],
    });

    assert.equal(result.status, "resolved");
    assert.equal(result.commit, "merge-commit");
    assert.ok(!("type" in result), "resolveAndSave must not return a publish result — the workflow handles downstream");
  });

  it("returns a fresh conflict packet when the target drifted since the original packet", async () => {
    const client = {
      compare: async () => ({ merge_base_commit: { sha: "base-sha" } }),
      getBranch: async (o, r, b) => ({ commit: { sha: b === "main" ? "main-sha" : "branch-sha" } }),
      getTree: async (o, r, sha) => {
        if (sha === "base-sha")   return { tree: [{ path: "a.md", type: "blob", sha: "a-base" }]};
        if (sha === "main-sha")   return { tree: [{ path: "a.md", type: "blob", sha: "a-main-NEW" }]};
        if (sha === "branch-sha") return { tree: [{ path: "a.md", type: "blob", sha: "a-branch" }]};
        return { tree: [] };
      },
      getBlob: async (o, r, sha) => {
        const map = { "a-base": "BASE", "a-main-NEW": "NEW MAIN", "a-branch": "BRANCH" };
        return { content: Buffer.from(map[sha] || "").toString("base64"), encoding: "base64" };
      },
    };

    const result = await resolveAndSave(client, "org", "repo", "aidos", {
      target: "main",
      merges: [{
        path: "a.md",
        original: { base: "BASE", theirs: "OLD MAIN", yours: "BRANCH" },
        resolved: "R",
      }],
    });

    assert.equal(result.status, "conflict");
  });
});

describe("editArtifacts", () => {
  function editTestClient({ files = {}, blobs = {} } = {}) {
    const calls = { createTree: [], createCommit: [], updateRef: [] };
    return {
      calls,
      getBranch: async () => ({ commit: { sha: "branch-sha" } }),
      getTree: async () => ({
        sha: "tree-sha",
        tree: Object.entries(files).map(([path, sha]) => ({ path, type: "blob", sha })),
      }),
      getBlob: async (o, r, sha) => ({
        content: Buffer.from(blobs[sha] || "").toString("base64"),
        encoding: "base64",
      }),
      createTree: async (o, r, baseTree, entries) => {
        calls.createTree.push({ baseTree, entries });
        return { sha: "new-tree-sha" };
      },
      createCommit: async (o, r, msg, tree, parents) => {
        calls.createCommit.push({ msg, tree, parents });
        return { sha: "new-commit-sha" };
      },
      updateRef: async (o, r, b, sha) => {
        calls.updateRef.push({ branch: b, sha });
        return {};
      },
    };
  }

  it("rejects when file doesn't exist on branch", async () => {
    const client = editTestClient({ files: {} });
    await assert.rejects(
      () =>
        editArtifacts(client, "org", "repo", "aidos", [
          { path: "missing.md", old_string: "x", new_string: "y" },
        ], "test"),
      /File not found on branch: missing\.md/,
    );
    assert.equal(client.calls.createCommit.length, 0);
  });

  it("commits a single-file edit atomically", async () => {
    const client = editTestClient({
      files: { "f1.md": "blob1" },
      blobs: { blob1: "Hello world" },
    });

    const result = await editArtifacts(client, "org", "repo", "aidos", [
      { path: "f1.md", old_string: "world", new_string: "there" },
    ], "Test edit");

    assert.equal(result.commit, "new-commit-sha");
    assert.equal(result.files_changed, 1);
    assert.equal(client.calls.createTree.length, 1);
    assert.equal(client.calls.createCommit.length, 1);
    assert.equal(client.calls.updateRef.length, 1);

    const treeEntry = client.calls.createTree[0].entries.find((e) => e.path === "f1.md");
    assert.equal(treeEntry.content, "Hello there");
  });

  it("commits a multi-file batch as a single commit", async () => {
    const client = editTestClient({
      files: { "a.md": "blobA", "b.md": "blobB" },
      blobs: { blobA: "hello", blobB: "world" },
    });

    const result = await editArtifacts(client, "org", "repo", "aidos", [
      { path: "a.md", old_string: "hello", new_string: "hi" },
      { path: "b.md", old_string: "world", new_string: "universe" },
    ], "Multi-file test");

    assert.equal(result.commit, "new-commit-sha");
    assert.equal(result.files_changed, 2);
    assert.equal(client.calls.createCommit.length, 1);
    assert.equal(client.calls.createTree[0].entries.length, 2);
  });

  it("applies multiple edits to the same file sequentially", async () => {
    const client = editTestClient({
      files: { "x.md": "blobX" },
      blobs: { blobX: "Hello world" },
    });

    const result = await editArtifacts(client, "org", "repo", "aidos", [
      { path: "x.md", old_string: "Hello", new_string: "Goodbye" },
      { path: "x.md", old_string: "Goodbye world", new_string: "Farewell universe" },
    ], "Sequential");

    assert.equal(result.files_changed, 1);
    const entry = client.calls.createTree[0].entries.find((e) => e.path === "x.md");
    assert.equal(entry.content, "Farewell universe");
  });

  it("is atomic when one file's edits fail", async () => {
    const client = editTestClient({
      files: { "a.md": "blobA", "b.md": "blobB" },
      blobs: { blobA: "hello", blobB: "world" },
    });

    await assert.rejects(
      () =>
        editArtifacts(client, "org", "repo", "aidos", [
          { path: "a.md", old_string: "hello", new_string: "hi" },
          { path: "b.md", old_string: "missing", new_string: "x" },
        ], "test"),
      /Edit failed for b\.md/,
    );

    assert.equal(client.calls.createCommit.length, 0);
    assert.equal(client.calls.updateRef.length, 0);
  });

  it("prefixes the commit message with [aidos]", async () => {
    const client = editTestClient({
      files: { "f.md": "blobF" },
      blobs: { blobF: "abc" },
    });

    await editArtifacts(client, "org", "repo", "aidos", [
      { path: "f.md", old_string: "abc", new_string: "xyz" },
    ], "Fix typo");

    assert.match(client.calls.createCommit[0].msg, /^\[aidos\] Fix typo$/);
  });
});
