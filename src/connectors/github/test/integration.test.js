import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { preflightPublish, resolveConflictsAndPublish } from "../server.js";

function makeState() {
  // Mutable state so we can simulate main advancing mid-flow.
  const trees = {
    "base-sha":   { tree: [{ path: "a.md", type: "blob", sha: "a-base" }] },
    "main-sha":   { tree: [{ path: "a.md", type: "blob", sha: "a-main" }] },
    "branch-sha": { tree: [{ path: "a.md", type: "blob", sha: "a-branch" }] },
  };
  const blobs = { "a-base": "BASE", "a-main": "MAIN", "a-branch": "BRANCH" };
  const branches = { main: "main-sha", "aidos/simon": "branch-sha" };
  return { trees, blobs, branches };
}

function makeClient(state) {
  return {
    compare: async () => ({
      merge_base_commit: { sha: "base-sha" },
      ahead_by: 1,
      behind_by: 2,
    }),
    getBranch: async (o, r, b) => ({ commit: { sha: state.branches[b] } }),
    getTree: async (o, r, sha) => state.trees[sha] || { tree: [] },
    getBlob: async (o, r, sha) => ({
      content: Buffer.from(state.blobs[sha] || "").toString("base64"),
      encoding: "base64",
    }),
    createTree: async () => ({ sha: "new-tree-sha" }),
    createCommit: async () => ({ sha: "merge-commit-sha" }),
    updateRef: async () => ({}),
    createPull: async () => ({ number: 7, html_url: "https://x/pr/7" }),
    requestReviewers: async () => ({}),
    lookupUser: async () => ({ login: "u" }),
  };
}

describe("publish → conflict → resolve loop", () => {
  it("completes end-to-end when agent resolves correctly", async () => {
    const state = makeState();
    const client = makeClient(state);

    // Step 1: preflight publish — returns conflict packet.
    const pre = await preflightPublish(client, "org", "repo", "aidos/simon", {
      strategy: "pr", target: "main", reviewers: [],
    });
    assert.equal(pre.ok, false);
    const packet = pre.conflict_packet;
    assert.equal(packet.status, "conflict");
    assert.equal(packet.conflicts.length, 1);

    // Step 2: agent echoes packet back with resolution.
    const merges = packet.conflicts.map((c) => ({
      path: c.path,
      original: { base: c.base, theirs: c.theirs, yours: c.yours },
      resolved: `RESOLVED(${c.yours}|${c.theirs})`,
    }));

    // Step 3: call resolve.
    const result = await resolveConflictsAndPublish(client, "org", "repo", "aidos/simon", {
      target: "main", strategy: "pr", reviewers: [], title: "t", body: "b", merges,
    });

    assert.equal(result.status, "resolved");
    assert.equal(result.type, "pr");
    assert.equal(result.number, 7);
  });

  it("surfaces a fresh conflict when main drifts mid-resolution", async () => {
    const state = makeState();
    const client = makeClient(state);

    // Preflight — capture packet.
    const pre = await preflightPublish(client, "org", "repo", "aidos/simon", {
      strategy: "pr", target: "main", reviewers: [],
    });
    const packet = pre.conflict_packet;
    const merges = packet.conflicts.map((c) => ({
      path: c.path,
      original: { base: c.base, theirs: c.theirs, yours: c.yours },
      resolved: "RESOLVED",
    }));

    // Simulate main advancing on the same file BEFORE resolve is called.
    state.trees["main-sha"] = { tree: [{ path: "a.md", type: "blob", sha: "a-main-new" }] };
    state.blobs["a-main-new"] = "NEWER MAIN";

    const result = await resolveConflictsAndPublish(client, "org", "repo", "aidos/simon", {
      target: "main", strategy: "pr", reviewers: [], title: "t", body: "b", merges,
    });

    assert.equal(result.status, "conflict");
    assert.equal(result.conflicts[0].theirs, "NEWER MAIN");
  });
});
