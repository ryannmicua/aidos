import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateManifest } from "../manifest.js";

describe("validateManifest", () => {
  it("accepts an empty manifest", () => {
    const result = validateManifest({});
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  it("accepts a publish-only manifest", () => {
    const result = validateManifest({
      publish: { confluence: { space: "ENG" } },
    });
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  it("rejects a manifest containing a write block (removed in v1.2.0)", () => {
    const result = validateManifest({
      write: { strategy: "pr", target: "main" },
    });
    assert.equal(result.valid, false);
    assert.ok(
      result.errors.some((e) => /additional|write/i.test(e)),
      `expected error mentioning 'write' or 'additional', got: ${JSON.stringify(result.errors)}`
    );
  });

  it("rejects unknown top-level keys", () => {
    const result = validateManifest({ bogus: 1 });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /bogus|additional/i.test(e)));
  });

  it("accepts arbitrary keys under publish (additionalProperties: true)", () => {
    const result = validateManifest({
      publish: { confluence: { space: "ENG" }, somethingNew: { foo: "bar" } },
    });
    assert.equal(result.valid, true);
  });
});
