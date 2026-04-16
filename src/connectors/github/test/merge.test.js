import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { indexTree, detectConflicts, buildConflictPacket } from "../merge.js";

describe("indexTree", () => {
  it("maps blob paths to their blob SHAs", () => {
    const tree = {
      tree: [
        { path: ".aidos/problem.md", type: "blob", sha: "aaa" },
        { path: ".aidos/solution.md", type: "blob", sha: "bbb" },
        { path: ".aidos", type: "tree", sha: "ttt" },
      ],
    };
    const map = indexTree(tree);
    assert.equal(map.get(".aidos/problem.md"), "aaa");
    assert.equal(map.get(".aidos/solution.md"), "bbb");
    assert.equal(map.has(".aidos"), false, "tree entries excluded");
    assert.equal(map.size, 2);
  });

  it("returns an empty map for an empty tree", () => {
    assert.equal(indexTree({ tree: [] }).size, 0);
  });
});

function mockMergeClient(overrides = {}) {
  const defaults = {
    compare: async () => ({
      merge_base_commit: { sha: "base-sha" },
    }),
    getBranch: async (owner, repo, branch) => ({
      commit: { sha: branch === "main" ? "main-sha" : "branch-sha" },
    }),
    getTree: async (owner, repo, sha) => {
      if (sha === "base-sha") {
        return { tree: [
          { path: ".aidos/problem.md", type: "blob", sha: "p-base" },
          { path: ".aidos/solution.md", type: "blob", sha: "s-base" },
        ]};
      }
      if (sha === "main-sha") {
        return { tree: [
          { path: ".aidos/problem.md", type: "blob", sha: "p-main" },  // changed on main
          { path: ".aidos/solution.md", type: "blob", sha: "s-base" }, // unchanged
        ]};
      }
      if (sha === "branch-sha") {
        return { tree: [
          { path: ".aidos/problem.md", type: "blob", sha: "p-branch" },// changed on branch (conflict!)
          { path: ".aidos/solution.md", type: "blob", sha: "s-base" }, // unchanged
        ]};
      }
      throw new Error("unexpected sha: " + sha);
    },
  };
  return { ...defaults, ...overrides };
}

describe("detectConflicts", () => {
  it("returns a conflict when both sides changed the same file", async () => {
    const client = mockMergeClient();
    const result = await detectConflicts(client, "org", "repo", "aidos/simon", "main");
    assert.deepEqual(result.conflicts, [".aidos/problem.md"]);
    assert.equal(result.baseSha, "base-sha");
    assert.equal(result.mainSha, "main-sha");
    assert.equal(result.branchSha, "branch-sha");
  });

  it("returns no conflicts when changes are disjoint", async () => {
    const client = mockMergeClient({
      getTree: async (o, r, sha) => {
        if (sha === "base-sha") return { tree: [
          { path: "a.md", type: "blob", sha: "a0" },
          { path: "b.md", type: "blob", sha: "b0" },
        ]};
        if (sha === "main-sha") return { tree: [
          { path: "a.md", type: "blob", sha: "a1" },  // main changed a
          { path: "b.md", type: "blob", sha: "b0" },
        ]};
        if (sha === "branch-sha") return { tree: [
          { path: "a.md", type: "blob", sha: "a0" },
          { path: "b.md", type: "blob", sha: "b1" },  // branch changed b
        ]};
      },
    });
    const result = await detectConflicts(client, "org", "repo", "aidos/simon", "main");
    assert.deepEqual(result.conflicts, []);
  });

  it("treats identical content changes on both sides as non-conflicting", async () => {
    const client = mockMergeClient({
      getTree: async (o, r, sha) => {
        if (sha === "base-sha") return { tree: [{ path: "x.md", type: "blob", sha: "x0" }]};
        if (sha === "main-sha") return { tree: [{ path: "x.md", type: "blob", sha: "x1" }]};
        if (sha === "branch-sha") return { tree: [{ path: "x.md", type: "blob", sha: "x1" }]};
      },
    });
    const result = await detectConflicts(client, "org", "repo", "aidos/simon", "main");
    assert.deepEqual(result.conflicts, []);
  });

  it("surfaces modify/delete conflicts (main modified, branch deleted)", async () => {
    const client = mockMergeClient({
      getTree: async (o, r, sha) => {
        if (sha === "base-sha") return { tree: [{ path: "x.md", type: "blob", sha: "x0" }]};
        if (sha === "main-sha") return { tree: [{ path: "x.md", type: "blob", sha: "x1" }]}; // modified
        if (sha === "branch-sha") return { tree: [] }; // deleted
      },
    });
    const result = await detectConflicts(client, "org", "repo", "aidos/simon", "main");
    assert.deepEqual(result.conflicts, ["x.md"]);
  });
});

describe("buildConflictPacket", () => {
  it("returns base/theirs/yours content for each conflicting path", async () => {
    const detection = {
      conflicts: ["a.md"],
      baseMap: new Map([["a.md", "a-base"]]),
      mainMap: new Map([["a.md", "a-main"]]),
      branchMap: new Map([["a.md", "a-branch"]]),
    };
    const blobs = {
      "a-base": "BASE CONTENT",
      "a-main": "MAIN CONTENT",
      "a-branch": "BRANCH CONTENT",
    };
    const client = {
      getBlob: async (o, r, sha) => ({
        content: Buffer.from(blobs[sha]).toString("base64"),
        encoding: "base64",
      }),
    };

    const packet = await buildConflictPacket(client, "org", "repo", detection);

    assert.equal(packet.status, "conflict");
    assert.equal(packet.conflicts.length, 1);
    const c = packet.conflicts[0];
    assert.equal(c.path, "a.md");
    assert.equal(c.base, "BASE CONTENT");
    assert.equal(c.theirs, "MAIN CONTENT");
    assert.equal(c.yours, "BRANCH CONTENT");
    assert.match(c.marker_form, /<<<<<<< yours/);
    assert.match(c.marker_form, /=======/);
    assert.match(c.marker_form, />>>>>>> theirs/);
  });

  it("represents a deleted side as empty string", async () => {
    const detection = {
      conflicts: ["x.md"],
      baseMap: new Map([["x.md", "x-base"]]),
      mainMap: new Map([["x.md", "x-main"]]),
      branchMap: new Map(), // deleted on branch
    };
    const blobs = { "x-base": "B", "x-main": "M" };
    const client = {
      getBlob: async (o, r, sha) => ({
        content: Buffer.from(blobs[sha]).toString("base64"),
        encoding: "base64",
      }),
    };

    const packet = await buildConflictPacket(client, "org", "repo", detection);
    assert.equal(packet.conflicts[0].yours, "");
    assert.equal(packet.conflicts[0].theirs, "M");
    assert.equal(packet.conflicts[0].base, "B");
  });

  it("includes instructions field", async () => {
    const detection = {
      conflicts: [],
      baseMap: new Map(),
      mainMap: new Map(),
      branchMap: new Map(),
    };
    const client = { getBlob: async () => ({ content: "", encoding: "base64" }) };
    const packet = await buildConflictPacket(client, "org", "repo", detection);
    assert.match(packet.instructions, /call resolve/i);
  });
});
