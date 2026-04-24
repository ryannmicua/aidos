import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveAndSave } from "../server.js";
import { detectConflicts, buildConflictPacket } from "../merge.js";

function makeState() {
  // Mutable state so we can simulate default-branch drift mid-flow.
  const trees = {
    "base-sha":   { tree: [{ path: "a.md", type: "blob", sha: "a-base" }] },
    "main-sha":   { tree: [{ path: "a.md", type: "blob", sha: "a-main" }] },
    "aidos-sha":  { tree: [{ path: "a.md", type: "blob", sha: "a-aidos" }] },
  };
  const blobs = { "a-base": "BASE", "a-main": "MAIN", "a-aidos": "AIDOS" };
  const branches = { main: "main-sha", aidos: "aidos-sha" };
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
  };
}

describe("conflict packet → resolve loop (aidos branch)", () => {
  it("commits the merge when resolutions match the packet and the target hasn't drifted", async () => {
    const state = makeState();
    const client = makeClient(state);

    // Step 1: detect conflicts between aidos and main and build a packet.
    const detection = await detectConflicts(client, "org", "repo", "aidos", "main");
    const packet = await buildConflictPacket(client, "org", "repo", detection);
    assert.equal(packet.status, "conflict");
    assert.equal(packet.conflicts.length, 1);

    // Step 2: the AI echoes the packet back with a resolved body per file.
    const merges = packet.conflicts.map((c) => ({
      path: c.path,
      original: { base: c.base, theirs: c.theirs, yours: c.yours },
      resolved: `RESOLVED(${c.yours}|${c.theirs})`,
    }));

    // Step 3: resolveAndSave commits the merge and returns.
    const result = await resolveAndSave(client, "org", "repo", "aidos", {
      target: "main",
      merges,
    });

    assert.equal(result.status, "resolved");
    assert.equal(result.commit, "merge-commit-sha");
    // The workflow owns everything after the branch update — resolveAndSave must NOT open a PR.
    assert.ok(!("type" in result));
  });

  it("surfaces a fresh conflict when the default branch drifts between packet and resolve", async () => {
    const state = makeState();
    const client = makeClient(state);

    const detection = await detectConflicts(client, "org", "repo", "aidos", "main");
    const packet = await buildConflictPacket(client, "org", "repo", detection);
    const merges = packet.conflicts.map((c) => ({
      path: c.path,
      original: { base: c.base, theirs: c.theirs, yours: c.yours },
      resolved: "RESOLVED",
    }));

    // Simulate main advancing on the same file before resolve fires.
    state.trees["main-sha"] = { tree: [{ path: "a.md", type: "blob", sha: "a-main-new" }] };
    state.blobs["a-main-new"] = "NEWER MAIN";

    const result = await resolveAndSave(client, "org", "repo", "aidos", {
      target: "main",
      merges,
    });

    assert.equal(result.status, "conflict");
    assert.equal(result.conflicts[0].theirs, "NEWER MAIN");
  });
});
