import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_TITLE_ATTEMPTS, suffixedTitle } from "./title-conflict.js";

test("MAX_TITLE_ATTEMPTS is 3", () => {
  assert.equal(MAX_TITLE_ATTEMPTS, 3);
});

test("suffixedTitle returns the plain title on attempt 0", () => {
  assert.equal(suffixedTitle("Issues Log", 0), "Issues Log");
});

test("suffixedTitle appends (1) on attempt 1", () => {
  assert.equal(suffixedTitle("Issues Log", 1), "Issues Log (1)");
});

test("suffixedTitle appends (N) for higher attempts", () => {
  assert.equal(suffixedTitle("Issues Log", 2), "Issues Log (2)");
  assert.equal(suffixedTitle("Issues Log", 7), "Issues Log (7)");
});

test("suffixedTitle preserves titles that already contain parentheses", () => {
  assert.equal(suffixedTitle("(PAN) Issues Log", 1), "(PAN) Issues Log (1)");
});
