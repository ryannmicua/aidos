import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "../github.js";

function mockFetch(status, body) {
  return async (url, opts) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
}

describe("createClient", () => {
  it("getUser returns login", async () => {
    const client = createClient("tok_test", mockFetch(200, { login: "simon" }));
    const user = await client.getUser();
    assert.equal(user.login, "simon");
  });

  it("throws on HTTP error with label", async () => {
    const client = createClient("tok_test", mockFetch(404, { message: "Not Found" }));
    await assert.rejects(() => client.getRepo("org", "repo"), /GitHub API 404.*getRepo/);
  });

  it("searchRepos encodes query", async () => {
    let captured;
    const client = createClient("tok_test", async (url, opts) => {
      captured = url;
      return { ok: true, status: 200, json: async () => ({ items: [] }) };
    });
    await client.searchRepos("my repo");
    assert.ok(captured.includes("my%20repo"));
  });

  it("createBranch sends correct ref format", async () => {
    let captured;
    const client = createClient("tok_test", async (url, opts) => {
      captured = { url, body: JSON.parse(opts.body) };
      return { ok: true, status: 201, json: async () => ({ ref: "refs/heads/aidos/simon" }) };
    });
    await client.createBranch("org", "repo", "aidos/simon", "abc123");
    assert.equal(captured.body.ref, "refs/heads/aidos/simon");
    assert.equal(captured.body.sha, "abc123");
  });

  it("getTree returns recursive tree", async () => {
    const tree = [
      { path: ".aidos/problem.md", type: "blob", sha: "aaa" },
      { path: ".aidos/solution.md", type: "blob", sha: "bbb" },
      { path: "src/index.js", type: "blob", sha: "ccc" },
    ];
    const client = createClient("tok_test", mockFetch(200, { sha: "root", tree }));
    const result = await client.getTree("org", "repo", "main");
    assert.equal(result.tree.length, 3);
  });
});
