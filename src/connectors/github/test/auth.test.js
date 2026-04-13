import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadToken, saveToken } from "../auth.js";

describe("token cache", () => {
  let dir;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "aidos-auth-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true });
  });

  it("returns null when no cached token", async () => {
    const token = await loadToken(join(dir, "auth.json"));
    assert.equal(token, null);
  });

  it("round-trips a token", async () => {
    const path = join(dir, "auth.json");
    await saveToken(path, { access_token: "gho_abc123", token_type: "bearer", scope: "repo" });
    const loaded = await loadToken(path);
    assert.equal(loaded.access_token, "gho_abc123");
  });

  it("returns null for corrupted file", async () => {
    const path = join(dir, "auth.json");
    const { writeFile } = await import("node:fs/promises");
    await writeFile(path, "not json");
    const token = await loadToken(path);
    assert.equal(token, null);
  });
});

describe("deviceFlow", () => {
  it("returns token after successful device flow", async () => {
    process.env.AIDOS_GITHUB_CLIENT_ID = "Iv23li_test_client_id";
    const mockFetch = async (url, opts) => {
      if (url.includes("/login/device/code")) {
        return {
          ok: true,
          json: async () => ({
            device_code: "dc_123",
            user_code: "ABCD-1234",
            verification_uri: "https://github.com/login/device",
            interval: 0,
          }),
        };
      }
      if (url.includes("/login/oauth/access_token")) {
        return {
          ok: true,
          json: async () => ({ access_token: "gho_test", token_type: "bearer", scope: "repo" }),
        };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    };

    const { deviceFlow } = await import("../auth.js");
    const result = await deviceFlow(mockFetch);
    assert.equal(result.access_token, "gho_test");
    delete process.env.AIDOS_GITHUB_CLIENT_ID;
  });

  it("throws clear error when AIDOS_GITHUB_CLIENT_ID is not set", async () => {
    delete process.env.AIDOS_GITHUB_CLIENT_ID;
    const { deviceFlow } = await import("../auth.js");
    await assert.rejects(
      () => deviceFlow(async () => ({ ok: true, json: async () => ({}) })),
      /AIDOS_GITHUB_CLIENT_ID/,
    );
  });
});
