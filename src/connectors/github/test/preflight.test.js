import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { preflightPublish } from "../server.js";

function mockClient(overrides = {}) {
  return {
    getBranch: async () => ({ commit: { sha: "abc" } }),
    compare: async () => ({ ahead_by: 1, behind_by: 0, files: [] }),
    lookupUser: async (login) => ({ login }),
    lookupTeam: async (org, slug) => ({ slug, org }),
    ...overrides,
  };
}

describe("preflightPublish", () => {
  it("passes when all checks ok", async () => {
    const client = mockClient();
    const result = await preflightPublish(client, "org", "repo", "aidos/simon", {
      strategy: "pr", target: "main", reviewers: [],
    });
    assert.equal(result.ok, true);
    assert.ok(result.checks.every((c) => c.pass));
  });

  it("fails when target branch missing", async () => {
    const client = mockClient({
      getBranch: async (o, r, b) => {
        if (b === "main") throw new Error("GitHub API 404");
        return { commit: { sha: "abc" } };
      },
    });
    const result = await preflightPublish(client, "org", "repo", "aidos/simon", {
      strategy: "pr", target: "main", reviewers: [],
    });
    assert.equal(result.ok, false);
    assert.ok(result.checks.find((c) => c.name === "target_branch" && !c.pass));
  });

  it("fails on merge conflict (behind_by > 0 with diverged history)", async () => {
    const client = mockClient({
      compare: async () => ({
        ahead_by: 1,
        behind_by: 2,
        files: [],
        merge_base_commit: { sha: "base-sha" },
      }),
      getBranch: async (o, r, b) => ({ commit: { sha: b === "main" ? "m1" : "b1" } }),
      getTree: async (o, r, sha) => {
        if (sha === "base-sha") return { tree: [{ path: "x.md", type: "blob", sha: "x0" }] };
        if (sha === "m1")       return { tree: [{ path: "x.md", type: "blob", sha: "x-main" }] };
        if (sha === "b1")       return { tree: [{ path: "x.md", type: "blob", sha: "x-branch" }] };
      },
      getBlob: async (o, r, sha) => ({
        content: Buffer.from({ "x0": "B", "x-main": "M", "x-branch": "R" }[sha]).toString("base64"),
        encoding: "base64",
      }),
    });
    const result = await preflightPublish(client, "org", "repo", "aidos/simon", {
      strategy: "pr", target: "main", reviewers: [],
    });
    assert.equal(result.ok, false);
    const conflict = result.checks.find((c) => c.name === "conflicts");
    assert.ok(conflict && !conflict.pass);
    assert.equal(result.conflict_packet?.status, "conflict");
  });

  it("validates individual reviewer via lookupUser", async () => {
    let lookedUp;
    const client = mockClient({
      lookupUser: async (login) => { lookedUp = login; return { login }; },
    });
    const result = await preflightPublish(client, "org", "repo", "aidos/simon", {
      strategy: "pr", target: "main", reviewers: ["alice"],
    });
    assert.equal(lookedUp, "alice");
    assert.equal(result.ok, true);
  });

  it("fails on invalid reviewer", async () => {
    const client = mockClient({
      lookupUser: async () => { throw new Error("GitHub API 404"); },
    });
    const result = await preflightPublish(client, "org", "repo", "aidos/simon", {
      strategy: "pr", target: "main", reviewers: ["bob"],
    });
    assert.equal(result.ok, false);
    assert.ok(result.checks.find((c) => c.name === "reviewers" && !c.pass));
  });

  it("validates team reviewer (@prefix) via lookupTeam", async () => {
    let lookedUp;
    const client = mockClient({
      lookupTeam: async (org, slug) => { lookedUp = { org, slug }; return { slug }; },
    });
    const result = await preflightPublish(client, "org", "repo", "aidos/simon", {
      strategy: "pr", target: "main", reviewers: ["@reviewers"],
    });
    assert.deepEqual(lookedUp, { org: "org", slug: "reviewers" });
    assert.equal(result.ok, true);
  });
});

describe("preflightPublish with diverged branch", () => {
  it("returns a conflict packet when detectConflicts finds conflicts", async () => {
    const client = {
      getBranch: async (o, r, b) => ({ commit: { sha: b === "main" ? "m1" : "b1" } }),
      compare: async (o, r, base, head) => ({
        behind_by: 2,
        ahead_by: 1,
        merge_base_commit: { sha: "base-sha" },
      }),
      getTree: async (o, r, sha) => {
        if (sha === "base-sha") return { tree: [{ path: "x.md", type: "blob", sha: "x0" }]};
        if (sha === "m1")       return { tree: [{ path: "x.md", type: "blob", sha: "x-main" }]};
        if (sha === "b1")       return { tree: [{ path: "x.md", type: "blob", sha: "x-branch" }]};
      },
      getBlob: async (o, r, sha) => ({
        content: Buffer.from({ "x0": "B", "x-main": "M", "x-branch": "R" }[sha]).toString("base64"),
        encoding: "base64",
      }),
      lookupUser: async () => ({ login: "alice" }),
    };

    const result = await preflightPublish(client, "org", "repo", "aidos/simon", {
      strategy: "pr",
      target: "main",
      reviewers: [],
    });

    assert.equal(result.ok, false);
    assert.equal(result.conflict_packet?.status, "conflict");
    assert.equal(result.conflict_packet.conflicts[0].path, "x.md");
  });

  it("reports 'behind but no conflicts' when diverged cleanly", async () => {
    const client = {
      getBranch: async (o, r, b) => ({ commit: { sha: b === "main" ? "m1" : "b1" } }),
      compare: async () => ({
        behind_by: 2, ahead_by: 1, merge_base_commit: { sha: "base-sha" },
      }),
      getTree: async (o, r, sha) => {
        if (sha === "base-sha") return { tree: [{ path: "x.md", type: "blob", sha: "x0" }]};
        if (sha === "m1")       return { tree: [{ path: "y.md", type: "blob", sha: "y-main" }, { path: "x.md", type: "blob", sha: "x0" }]};
        if (sha === "b1")       return { tree: [{ path: "z.md", type: "blob", sha: "z-branch" }, { path: "x.md", type: "blob", sha: "x0" }]};
      },
      lookupUser: async () => ({ login: "alice" }),
    };

    const result = await preflightPublish(client, "org", "repo", "aidos/simon", {
      strategy: "pr", target: "main", reviewers: [],
    });

    assert.equal(result.ok, true);
    assert.equal(result.conflict_packet, undefined);
    const mergeCheck = result.checks.find((c) => c.name === "conflicts");
    assert.ok(mergeCheck.pass);
    assert.match(mergeCheck.message, /behind by 2.*no conflicts/i);
  });
});
