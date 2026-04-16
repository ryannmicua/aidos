import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { indexTree, detectConflicts, buildConflictPacket, stalenessCheck, buildMergedTree } from "../merge.js";

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

describe("stalenessCheck", () => {
  const detection = {
    baseMap: new Map([["a.md", "a-base"]]),
    mainMap: new Map([["a.md", "a-main-live"]]),
    branchMap: new Map([["a.md", "a-branch-live"]]),
  };
  const blobs = {
    "a-main-live": "LIVE MAIN",
    "a-branch-live": "LIVE BRANCH",
  };
  const client = {
    getBlob: async (o, r, sha) => ({
      content: Buffer.from(blobs[sha] || "").toString("base64"),
      encoding: "base64",
    }),
  };

  it("returns [] when original matches live", async () => {
    const merges = new Map([["a.md", {
      path: "a.md",
      original: { base: "whatever", theirs: "LIVE MAIN", yours: "LIVE BRANCH" },
      resolved: "RESOLVED",
    }]]);
    const stale = await stalenessCheck(client, "org", "repo", merges, detection);
    assert.deepEqual(stale, []);
  });

  it("flags a path when original.theirs mismatches live theirs", async () => {
    const merges = new Map([["a.md", {
      path: "a.md",
      original: { base: "x", theirs: "STALE MAIN", yours: "LIVE BRANCH" },
      resolved: "RESOLVED",
    }]]);
    const stale = await stalenessCheck(client, "org", "repo", merges, detection);
    assert.deepEqual(stale, ["a.md"]);
  });

  it("flags a path when original.yours mismatches live yours", async () => {
    const merges = new Map([["a.md", {
      path: "a.md",
      original: { base: "x", theirs: "LIVE MAIN", yours: "STALE BRANCH" },
      resolved: "RESOLVED",
    }]]);
    const stale = await stalenessCheck(client, "org", "repo", merges, detection);
    assert.deepEqual(stale, ["a.md"]);
  });
});

describe("buildMergedTree", () => {
  function makeDetection({ base = {}, main = {}, branch = {} }) {
    return {
      baseMap: new Map(Object.entries(base)),
      mainMap: new Map(Object.entries(main)),
      branchMap: new Map(Object.entries(branch)),
    };
  }

  it("uses resolved content for a conflicting path", () => {
    const det = makeDetection({
      base:   { "x.md": "xb" },
      main:   { "x.md": "xm" },
      branch: { "x.md": "xr" },
    });
    const resolved = new Map([["x.md", { path: "x.md", resolved: "RESOLVED" }]]);
    const entries = buildMergedTree(det, resolved);
    const x = entries.find((e) => e.path === "x.md");
    assert.equal(x.content, "RESOLVED");
    assert.equal(x.sha, undefined);
  });

  it("takes main's SHA for a main-only change", () => {
    const det = makeDetection({
      base:   { "a.md": "a0" },
      main:   { "a.md": "a1" },
      branch: { "a.md": "a0" },
    });
    const entries = buildMergedTree(det, new Map());
    const a = entries.find((e) => e.path === "a.md");
    assert.equal(a.sha, "a1");
  });

  it("takes branch's SHA for a branch-only change", () => {
    const det = makeDetection({
      base:   { "b.md": "b0" },
      main:   { "b.md": "b0" },
      branch: { "b.md": "b1" },
    });
    const entries = buildMergedTree(det, new Map());
    const b = entries.find((e) => e.path === "b.md");
    assert.equal(b.sha, "b1");
  });

  it("keeps base SHA when unchanged on both", () => {
    const det = makeDetection({
      base:   { "u.md": "u0" },
      main:   { "u.md": "u0" },
      branch: { "u.md": "u0" },
    });
    const entries = buildMergedTree(det, new Map());
    const u = entries.find((e) => e.path === "u.md");
    assert.equal(u.sha, "u0");
  });

  it("includes files added only on main", () => {
    const det = makeDetection({
      base:   {},
      main:   { "new.md": "n1" },
      branch: {},
    });
    const entries = buildMergedTree(det, new Map());
    const n = entries.find((e) => e.path === "new.md");
    assert.equal(n.sha, "n1");
  });

  it("includes files added only on branch", () => {
    const det = makeDetection({
      base:   {},
      main:   {},
      branch: { "new.md": "n1" },
    });
    const entries = buildMergedTree(det, new Map());
    const n = entries.find((e) => e.path === "new.md");
    assert.equal(n.sha, "n1");
  });

  it("omits files deleted on main and unchanged on branch", () => {
    const det = makeDetection({
      base:   { "gone.md": "g0" },
      main:   {},
      branch: { "gone.md": "g0" },
    });
    const entries = buildMergedTree(det, new Map());
    assert.equal(entries.find((e) => e.path === "gone.md"), undefined);
  });

  it("omits files deleted on branch and unchanged on main", () => {
    const det = makeDetection({
      base:   { "gone.md": "g0" },
      main:   { "gone.md": "g0" },
      branch: {},
    });
    const entries = buildMergedTree(det, new Map());
    assert.equal(entries.find((e) => e.path === "gone.md"), undefined);
  });

  it("uses mode 100644 and type blob for all entries", () => {
    const det = makeDetection({
      base: { "a.md": "a0" }, main: { "a.md": "a1" }, branch: { "a.md": "a0" },
    });
    const [entry] = buildMergedTree(det, new Map());
    assert.equal(entry.mode, "100644");
    assert.equal(entry.type, "blob");
  });

  it("takes the common SHA when both sides made the same change", () => {
    const det = makeDetection({
      base:   { "c.md": "c0" },
      main:   { "c.md": "c1" },
      branch: { "c.md": "c1" },
    });
    const entries = buildMergedTree(det, new Map());
    const c = entries.find((e) => e.path === "c.md");
    assert.equal(c.sha, "c1");
  });

  it("omits files deleted on both main and branch", () => {
    const det = makeDetection({
      base:   { "old.md": "o0" },
      main:   {},
      branch: {},
    });
    const entries = buildMergedTree(det, new Map());
    assert.equal(entries.find((e) => e.path === "old.md"), undefined);
  });
});
