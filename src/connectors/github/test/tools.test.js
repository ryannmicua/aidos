import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveWorkspace, readArtifacts, saveArtifacts, diffBranch, publishChanges, resolveConflictsAndPublish, editArtifacts } from "../server.js";

function mockClient(overrides = {}) {
  const defaults = {
    getUser: async () => ({ login: "simon" }),
    searchRepos: async () => ({ items: [{ full_name: "org/my-repo", default_branch: "main" }] }),
    getRepo: async (o, r) => ({ full_name: `${o}/${r}`, default_branch: "main" }),
    getBranch: async () => { throw new Error("GitHub API 404"); },
    createBranch: async () => ({ ref: "refs/heads/aidos/simon" }),
    getTree: async () => ({
      sha: "root",
      tree: [
        { path: ".aidos/problem.md", type: "blob", sha: "aaa" },
        { path: ".aidos/manifest.json", type: "blob", sha: "bbb" },
        { path: "src/index.js", type: "blob", sha: "ccc" },
      ],
    }),
    getBlob: async () => ({
      content: Buffer.from(JSON.stringify({ write: { strategy: "pr", target: "main" } })).toString("base64"),
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
  it("creates branch when it does not exist", async () => {
    let getBranchCallCount = 0;
    const client = mockClient({
      // First call (check if user branch exists) → 404
      // Second call (get default branch SHA) → success
      // Third call (get user branch head after create) → success
      getBranch: async (owner, repo, branch) => {
        getBranchCallCount++;
        if (branch === "aidos/simon") {
          throw new Error("GitHub API 404");
        }
        // Default branch or user branch after creation
        return { commit: { sha: "abc123" }, name: branch };
      },
    });

    const result = await resolveWorkspace(client, "simon", "org/my-repo", null);

    assert.equal(result.branch, "aidos/simon");
    assert.equal(result.branch_created, true);
    assert.equal(result.default_branch, "main");
    assert.equal(result.repo, "org/my-repo");
  });

  it("syncs existing branch", async () => {
    let mergeCalled = false;
    const client = mockClient({
      getBranch: async () => ({ commit: { sha: "abc123" }, name: "aidos/simon" }),
      merge: async () => {
        mergeCalled = true;
        return {};
      },
    });

    const result = await resolveWorkspace(client, "simon", "org/my-repo", null);

    assert.equal(result.branch_created, false);
    assert.equal(result.branch, "aidos/simon");
    assert.ok(mergeCalled, "merge should be called to sync existing branch");
  });

  it("discovers .aidos/ folders", async () => {
    const client = mockClient({
      getBranch: async (owner, repo, branch) => ({ commit: { sha: "abc123" }, name: branch }),
    });

    const result = await resolveWorkspace(client, "simon", "org/my-repo", null);

    assert.equal(result.aidos_folders.length, 1);
    assert.equal(result.aidos_folders[0].path, ".aidos");
    assert.ok(result.aidos_folders[0].write, "write config should be present");
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
    assert.ok(paths.includes(".aidos"), "root .aidos/ should be found");
    assert.ok(paths.includes("services/auth/.aidos"), "nested .aidos/ should be found");
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

  it("reports work in progress when branch is ahead of target", async () => {
    const client = mockClient({
      getBranch: async () => ({ commit: { sha: "abc123" }, name: "aidos/simon" }),
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

  it("no work_in_progress when branch is even with target", async () => {
    const client = mockClient({
      getBranch: async () => ({ commit: { sha: "abc123" }, name: "aidos/simon" }),
      compare: async () => ({ ahead_by: 0, files: [] }),
    });
    const result = await resolveWorkspace(client, "simon", "org/my-repo", null);
    assert.equal(result.work_in_progress, null);
  });

  it("surfaces last publish workflow run when available", async () => {
    const client = mockClient({
      getBranch: async () => ({ commit: { sha: "abc" }, name: "aidos/simon" }),
      listWorkflows: async () => ({ workflows: [{ id: 42, name: "Publish to Confluence", path: ".github/workflows/confluence-publish.yml" }] }),
      listWorkflowRuns: async (o, r, wid) => {
        assert.equal(wid, 42);
        return { workflow_runs: [{ id: 100, conclusion: "success", created_at: "2026-04-15T10:00:00Z", html_url: "https://github.com/org/my-repo/actions/runs/100" }] };
      },
    });

    const result = await resolveWorkspace(client, "simon", "org/my-repo", null);
    assert.ok(result.publish_status, "publish_status should be populated");
    assert.equal(result.publish_status.workflow, "Publish to Confluence");
    assert.equal(result.publish_status.conclusion, "success");
  });

  it("publish_status is null when no matching workflow", async () => {
    const client = mockClient({
      getBranch: async () => ({ commit: { sha: "abc" }, name: "aidos/simon" }),
      listWorkflows: async () => ({ workflows: [{ id: 1, name: "CI", path: ".github/workflows/ci.yml" }] }),
    });

    const result = await resolveWorkspace(client, "simon", "org/my-repo", null);
    assert.equal(result.publish_status, null);
  });

  it("does not match paths where .aidos is a segment suffix (not its own segment)", async () => {
    const client = mockClient({
      getBranch: async () => ({ commit: { sha: "abc" }, name: "aidos/simon" }),
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
    assert.deepEqual(paths, [".aidos"], "only the real .aidos/ folder should be discovered");
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
        return { content: Buffer.from(JSON.stringify({ write: { strategy: "pr", target: "main" } })).toString("base64"), encoding: "base64" };
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
      getBranch: async () => ({ commit: { sha: "head123" }, name: "aidos/simon" }),
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

    const result = await readArtifacts(client, "org", "my-repo", "aidos/simon", ".aidos");

    assert.equal(result.files.length, 4, "should return only .aidos/ files");
    const paths = result.files.map((f) => f.path);
    assert.ok(paths.includes(".aidos/problem.md"));
    assert.ok(paths.includes(".aidos/solution.md"));
    assert.ok(paths.includes(".aidos/manifest.json"));
    assert.ok(paths.includes(".aidos/feature-auth/feature-auth.md"));
    assert.ok(!paths.includes("src/index.js"), "src/ file should not be included");

    for (const file of result.files) {
      assert.ok(file.path, "each file should have a path");
      assert.ok(file.content, "each file should have content");
      assert.ok(file.sha, "each file should have a sha");
    }
  });

  it("returns empty array for folder with no files", async () => {
    const client = mockClient({
      getBranch: async () => ({ commit: { sha: "head123" }, name: "aidos/simon" }),
      getTree: async () => ({ sha: "root", tree: [] }),
    });

    const result = await readArtifacts(client, "org", "my-repo", "aidos/simon", ".aidos");

    assert.equal(result.files.length, 0);
  });
});

describe("saveArtifacts", () => {
  it("creates atomic commit with all files", async () => {
    let createTreeArgs;
    let createCommitArgs;
    let updateRefArgs;

    const client = mockClient({
      getBranch: async () => ({ commit: { sha: "head123" }, name: "aidos/simon" }),
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

    const result = await saveArtifacts(client, "org", "my-repo", "aidos/simon", files, "update docs");

    assert.ok(createTreeArgs, "createTree should be called");
    assert.equal(createTreeArgs.treeEntries.length, 2, "tree should have both files");
    assert.equal(createTreeArgs.treeEntries[0].mode, "100644");
    assert.equal(createTreeArgs.treeEntries[0].type, "blob");

    assert.ok(createCommitArgs, "createCommit should be called");
    assert.ok(createCommitArgs.message.startsWith("[aidos]"), "commit message should start with [aidos]");

    assert.ok(updateRefArgs, "updateRef should be called");
    assert.equal(updateRefArgs.sha, "new-commit-sha");

    assert.equal(result.commit, "new-commit-sha");
    assert.equal(result.files_changed, 2);
  });

  it("skips commit when no files provided", async () => {
    const client = mockClient();

    const result = await saveArtifacts(client, "org", "my-repo", "aidos/simon", [], "empty");

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

    const result = await diffBranch(client, "org", "my-repo", "aidos/simon", "main");

    assert.equal(result.files.length, 2, "should only include .aidos/ files");
    assert.ok(result.files.every((f) => f.filename.includes(".aidos/")), "all files should be in .aidos/");
    assert.equal(result.summary.files_changed, 2);
    assert.equal(result.summary.additions, 15);
    assert.equal(result.summary.deletions, 2);
    assert.equal(result.summary.commits_ahead, 2);

    const first = result.files[0];
    assert.ok("filename" in first);
    assert.ok("status" in first);
    assert.ok("additions" in first);
    assert.ok("deletions" in first);
    assert.ok("patch" in first);
  });

  it("returns empty diff when no changes", async () => {
    const client = mockClient({
      compare: async () => ({
        files: [],
        ahead_by: 0,
      }),
    });

    const result = await diffBranch(client, "org", "my-repo", "aidos/simon", "main");

    assert.equal(result.files.length, 0);
    assert.equal(result.summary.files_changed, 0);
    assert.equal(result.summary.commits_ahead, 0);
  });
});

describe("publishChanges", () => {
  it("creates PR with reviewers when strategy is pr", async () => {
    let createPullArgs;
    let requestReviewersArgs;

    const client = mockClient({
      createPull: async (owner, repo, opts) => {
        createPullArgs = { owner, repo, opts };
        return { number: 42, html_url: "https://github.com/org/my-repo/pull/42" };
      },
      requestReviewers: async (owner, repo, pullNumber, reviewers) => {
        requestReviewersArgs = { owner, repo, pullNumber, reviewers };
        return {};
      },
    });

    const result = await publishChanges(client, "org", "my-repo", "aidos/simon", {
      strategy: "pr",
      target: "main",
      reviewers: ["alice", "bob"],
      title: "Add problem statement",
      body: "Initial problem doc",
    });

    assert.equal(result.type, "pr");
    assert.equal(result.number, 42);
    assert.equal(result.url, "https://github.com/org/my-repo/pull/42");
    assert.ok(createPullArgs, "createPull should be called");
    assert.ok(requestReviewersArgs, "requestReviewers should be called");
  });

  it("merges and deletes branch when strategy is push", async () => {
    let mergeCalled = false;
    let deleteRefCalled = false;

    const client = mockClient({
      merge: async () => {
        mergeCalled = true;
        return { sha: "merge-sha-abc" };
      },
      deleteRef: async () => {
        deleteRefCalled = true;
        return {};
      },
    });

    const result = await publishChanges(client, "org", "my-repo", "aidos/simon", {
      strategy: "push",
      target: "main",
      reviewers: [],
    });

    assert.equal(result.type, "push");
    assert.equal(result.merge_sha, "merge-sha-abc");
    assert.equal(result.branch_deleted, true);
    assert.ok(mergeCalled, "merge should be called");
    assert.ok(deleteRefCalled, "deleteRef should be called");
  });

  it("skips reviewers when none specified", async () => {
    let requestReviewersCalled = false;

    const client = mockClient({
      createPull: async () => ({ number: 7, html_url: "https://github.com/org/my-repo/pull/7" }),
      requestReviewers: async () => {
        requestReviewersCalled = true;
        return {};
      },
    });

    await publishChanges(client, "org", "my-repo", "aidos/simon", {
      strategy: "pr",
      target: "main",
      reviewers: [],
      title: "Empty reviewers test",
    });

    assert.equal(requestReviewersCalled, false, "requestReviewers should NOT be called when no reviewers");
  });
});

describe("resolveConflictsAndPublish", () => {
  it("opens a PR after a successful resolve", async () => {
    let created = null;
    const client = {
      // detectConflicts path
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
      // publishChanges path
      createPull: async (o, r, opts) => { created = opts; return { number: 42, html_url: "https://x/pr/42" }; },
      requestReviewers: async () => ({}),
    };

    const result = await resolveConflictsAndPublish(client, "org", "repo", "aidos/simon", {
      target: "main",
      strategy: "pr",
      reviewers: [],
      title: "t",
      body: "b",
      merges: [{
        path: "a.md",
        original: { base: "BASE", theirs: "MAIN", yours: "BRANCH" },
        resolved: "RESOLVED",
      }],
    });

    assert.equal(result.status, "resolved");
    assert.equal(result.type, "pr");
    assert.equal(result.number, 42);
    assert.equal(created.head, "aidos/simon");
    assert.equal(created.base, "main");
  });

  it("returns the conflict packet without opening PR when resolve surfaces new conflicts", async () => {
    let createPullCalled = false;
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
      createPull: async () => { createPullCalled = true; return { number: 0, html_url: "x" }; },
    };

    const result = await resolveConflictsAndPublish(client, "org", "repo", "aidos/simon", {
      target: "main", strategy: "pr", reviewers: [], title: "t", body: "b",
      merges: [{
        path: "a.md",
        original: { base: "BASE", theirs: "OLD MAIN", yours: "BRANCH" },
        resolved: "R",
      }],
    });

    assert.equal(result.status, "conflict");
    assert.equal(createPullCalled, false);
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
        editArtifacts(client, "org", "repo", "aidos/simon", [
          { path: "missing.md", old_string: "x", new_string: "y" },
        ], "test"),
      /File not found on branch: missing\.md/,
    );
    assert.equal(client.calls.createCommit.length, 0, "no commit on validation failure");
  });

  it("commits a single-file edit atomically", async () => {
    const client = editTestClient({
      files: { "f1.md": "blob1" },
      blobs: { blob1: "Hello world" },
    });

    const result = await editArtifacts(client, "org", "repo", "aidos/simon", [
      { path: "f1.md", old_string: "world", new_string: "there" },
    ], "Test edit");

    assert.equal(result.commit, "new-commit-sha");
    assert.equal(result.files_changed, 1);
    assert.equal(client.calls.createTree.length, 1);
    assert.equal(client.calls.createCommit.length, 1);
    assert.equal(client.calls.updateRef.length, 1);

    const treeEntry = client.calls.createTree[0].entries.find((e) => e.path === "f1.md");
    assert.equal(treeEntry.content, "Hello there");
    assert.equal(treeEntry.mode, "100644");
    assert.equal(treeEntry.type, "blob");
  });

  it("commits a multi-file batch as a single commit", async () => {
    const client = editTestClient({
      files: { "a.md": "blobA", "b.md": "blobB" },
      blobs: { blobA: "hello", blobB: "world" },
    });

    const result = await editArtifacts(client, "org", "repo", "aidos/simon", [
      { path: "a.md", old_string: "hello", new_string: "hi" },
      { path: "b.md", old_string: "world", new_string: "universe" },
    ], "Multi-file test");

    assert.equal(result.commit, "new-commit-sha");
    assert.equal(result.files_changed, 2);
    assert.equal(client.calls.createCommit.length, 1, "single commit for batch");
    assert.equal(client.calls.createTree[0].entries.length, 2);
  });

  it("applies multiple edits to the same file sequentially", async () => {
    const client = editTestClient({
      files: { "x.md": "blobX" },
      blobs: { blobX: "Hello world" },
    });

    const result = await editArtifacts(client, "org", "repo", "aidos/simon", [
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
        editArtifacts(client, "org", "repo", "aidos/simon", [
          { path: "a.md", old_string: "hello", new_string: "hi" },
          { path: "b.md", old_string: "missing", new_string: "x" },
        ], "test"),
      /Edit failed for b\.md/,
    );

    assert.equal(client.calls.createCommit.length, 0, "no commit when any file fails");
    assert.equal(client.calls.updateRef.length, 0, "no ref update when any file fails");
  });

  it("prefixes the commit message with [aidos]", async () => {
    const client = editTestClient({
      files: { "f.md": "blobF" },
      blobs: { blobF: "abc" },
    });

    await editArtifacts(client, "org", "repo", "aidos/simon", [
      { path: "f.md", old_string: "abc", new_string: "xyz" },
    ], "Fix typo");

    assert.match(client.calls.createCommit[0].msg, /^\[aidos\] Fix typo$/);
  });
});

describe("publishChanges — staged strategy", () => {
  it("merges working branch into staging branch and deletes working branch", async () => {
    let mergedInto = null;
    let mergedFrom = null;
    let deletedBranch = null;
    let createPullCalled = false;

    const client = mockClient({
      merge: async (owner, repo, base, head) => {
        mergedInto = base;
        mergedFrom = head;
        return { sha: "merge-abc" };
      },
      deleteRef: async (owner, repo, branch) => {
        deletedBranch = branch;
        return null;
      },
      createPull: async () => {
        createPullCalled = true;
        return { number: 99, html_url: "should-not-be-called" };
      },
    });

    const result = await publishChanges(client, "org", "repo", "aidos/simon", {
      strategy: "staged",
      target: "aidos",
    });

    assert.equal(result.type, "staged");
    assert.equal(result.merge_sha, "merge-abc");
    assert.equal(result.branch_deleted, true);
    assert.equal(mergedInto, "aidos");
    assert.equal(mergedFrom, "aidos/simon");
    assert.equal(deletedBranch, "aidos/simon");
    assert.equal(createPullCalled, false, "staged strategy must not open a PR — workflow owns that");
  });

  it("ignores reviewers, title, body for staged (those apply to the rolling PR, not each publish)", async () => {
    let requestedReviewers = false;
    const client = mockClient({
      merge: async () => ({ sha: "ok" }),
      deleteRef: async () => null,
      requestReviewers: async () => {
        requestedReviewers = true;
        return null;
      },
    });

    const result = await publishChanges(client, "org", "repo", "aidos/simon", {
      strategy: "staged",
      target: "aidos",
      reviewers: ["@team"],
      title: "ignored",
      body: "ignored",
    });

    assert.equal(result.type, "staged");
    assert.equal(requestedReviewers, false);
  });
});

describe("resolveWorkspace — staged folders", () => {
  it("creates staging branch from default when missing", async () => {
    const created = [];
    const stagedManifest = { write: { strategy: "staged", target: "main", staging_branch: "aidos" } };

    const client = mockClient({
      getBranch: async (owner, repo, branch) => {
        if (branch === "aidos/simon") throw new Error("GitHub API 404");
        if (branch === "aidos") throw new Error("GitHub API 404");
        return { commit: { sha: "default-tip" }, name: branch };
      },
      createBranch: async (owner, repo, name, sha) => {
        created.push({ name, sha });
        return { ref: `refs/heads/${name}` };
      },
      getTree: async () => ({
        sha: "root",
        tree: [
          { path: ".aidos/problem.md", type: "blob", sha: "aaa" },
          { path: ".aidos/manifest.json", type: "blob", sha: "bbb" },
        ],
      }),
      getBlob: async () => ({
        content: Buffer.from(JSON.stringify(stagedManifest)).toString("base64"),
        encoding: "base64",
      }),
    });

    await resolveWorkspace(client, "simon", "org/my-repo", null);

    assert.ok(created.some((c) => c.name === "aidos/simon"), "user branch should be created");
    assert.ok(created.some((c) => c.name === "aidos"), "staging branch should be created");
  });

  it("leaves staging branch alone when it already exists", async () => {
    const created = [];
    const stagedManifest = { write: { strategy: "staged", target: "main", staging_branch: "aidos" } };

    const client = mockClient({
      getBranch: async (owner, repo, branch) => {
        if (branch === "aidos/simon") throw new Error("GitHub API 404");
        // staging and default both exist
        return { commit: { sha: "some-sha" }, name: branch };
      },
      createBranch: async (owner, repo, name, sha) => {
        created.push({ name, sha });
        return { ref: `refs/heads/${name}` };
      },
      getTree: async () => ({
        sha: "root",
        tree: [
          { path: ".aidos/manifest.json", type: "blob", sha: "bbb" },
        ],
      }),
      getBlob: async () => ({
        content: Buffer.from(JSON.stringify(stagedManifest)).toString("base64"),
        encoding: "base64",
      }),
    });

    await resolveWorkspace(client, "simon", "org/my-repo", null);

    assert.ok(created.some((c) => c.name === "aidos/simon"), "user branch should still be created");
    assert.ok(!created.some((c) => c.name === "aidos"), "staging branch should NOT be recreated when it exists");
  });

  it("does nothing extra for non-staged folders", async () => {
    const created = [];
    const prManifest = { write: { strategy: "pr", target: "main" } };

    const client = mockClient({
      getBranch: async (owner, repo, branch) => {
        if (branch === "aidos/simon") throw new Error("GitHub API 404");
        return { commit: { sha: "default-tip" }, name: branch };
      },
      createBranch: async (owner, repo, name, sha) => {
        created.push({ name, sha });
        return { ref: `refs/heads/${name}` };
      },
      getTree: async () => ({
        sha: "root",
        tree: [
          { path: ".aidos/manifest.json", type: "blob", sha: "bbb" },
        ],
      }),
      getBlob: async () => ({
        content: Buffer.from(JSON.stringify(prManifest)).toString("base64"),
        encoding: "base64",
      }),
    });

    await resolveWorkspace(client, "simon", "org/my-repo", null);

    assert.equal(created.length, 1, "only user branch should be created");
    assert.equal(created[0].name, "aidos/simon");
  });

  it("uses default staging_branch name 'aidos' when manifest omits it", async () => {
    const created = [];
    const stagedNoName = { write: { strategy: "staged", target: "main" } };

    const client = mockClient({
      getBranch: async (owner, repo, branch) => {
        if (branch === "aidos/simon") throw new Error("GitHub API 404");
        if (branch === "aidos") throw new Error("GitHub API 404");
        return { commit: { sha: "default-tip" }, name: branch };
      },
      createBranch: async (owner, repo, name, sha) => {
        created.push({ name, sha });
        return { ref: `refs/heads/${name}` };
      },
      getTree: async () => ({
        sha: "root",
        tree: [{ path: ".aidos/manifest.json", type: "blob", sha: "bbb" }],
      }),
      getBlob: async () => ({
        content: Buffer.from(JSON.stringify(stagedNoName)).toString("base64"),
        encoding: "base64",
      }),
    });

    await resolveWorkspace(client, "simon", "org/my-repo", null);

    assert.ok(created.some((c) => c.name === "aidos"), "default name 'aidos' should be used");
  });
});
