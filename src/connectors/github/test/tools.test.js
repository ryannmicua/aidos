import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveWorkspace, readArtifacts, saveArtifacts, diffBranch, submitChanges } from "../server.js";

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

describe("submitChanges", () => {
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

    const result = await submitChanges(client, "org", "my-repo", "aidos/simon", {
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

    const result = await submitChanges(client, "org", "my-repo", "aidos/simon", {
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

    await submitChanges(client, "org", "my-repo", "aidos/simon", {
      strategy: "pr",
      target: "main",
      reviewers: [],
      title: "Empty reviewers test",
    });

    assert.equal(requestReviewersCalled, false, "requestReviewers should NOT be called when no reviewers");
  });
});
