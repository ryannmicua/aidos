import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_TITLE_ATTEMPTS, suffixedTitle, isDuplicateTitleError } from "./title-conflict.js";

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

test("isDuplicateTitleError matches real v1.0.3 Zenith.Core error", () => {
  const err = new Error(
    'Confluence API 400 [createPage "(PAN) Issues Log"]: {"statusCode":400,"message":"com.atlassian.confluence.api.service.exceptions.api.BadRequestException: A page with this title already exists: A page already exists with the same TITLE in this space"}',
  );
  assert.equal(isDuplicateTitleError(err), true);
});

test("isDuplicateTitleError matches the shorter wording", () => {
  const err = new Error("Confluence API 400: A page with this title already exists");
  assert.equal(isDuplicateTitleError(err), true);
});

test("isDuplicateTitleError returns false for other 400s", () => {
  const err = new Error("Confluence API 400: Invalid ancestor id");
  assert.equal(isDuplicateTitleError(err), false);
});

test("isDuplicateTitleError returns false for 5xx", () => {
  const err = new Error("Confluence API 503: Service Unavailable");
  assert.equal(isDuplicateTitleError(err), false);
});

test("isDuplicateTitleError handles non-Error inputs safely", () => {
  assert.equal(isDuplicateTitleError(null), false);
  assert.equal(isDuplicateTitleError(undefined), false);
  assert.equal(isDuplicateTitleError({}), false);
  assert.equal(isDuplicateTitleError("A page with this title already exists"), false);
});
