import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_TITLE_ATTEMPTS, suffixedTitle, isDuplicateTitleError, createWithRetryOnDuplicate, findOwnedPageByTitle } from "./title-conflict.js";

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

test("isDuplicateTitleError is case-insensitive", () => {
  const err = new Error("A PAGE WITH THIS TITLE ALREADY EXISTS");
  assert.equal(isDuplicateTitleError(err), true);
});

function dupError() {
  return new Error("A page with this title already exists");
}

test("createWithRetryOnDuplicate succeeds on first attempt when no conflict", async () => {
  const attempts = [];
  const doCreate = async (title) => {
    attempts.push(title);
    return { id: "page-1" };
  };
  const out = await createWithRetryOnDuplicate("Issues Log", doCreate);
  assert.deepEqual(attempts, ["Issues Log"]);
  assert.equal(out.title, "Issues Log");
  assert.equal(out.renamed, false);
  assert.deepEqual(out.result, { id: "page-1" });
});

test("createWithRetryOnDuplicate retries with (1) after one duplicate", async () => {
  const attempts = [];
  const doCreate = async (title) => {
    attempts.push(title);
    if (title === "Issues Log") throw dupError();
    return { id: "page-2" };
  };
  const out = await createWithRetryOnDuplicate("Issues Log", doCreate);
  assert.deepEqual(attempts, ["Issues Log", "Issues Log (1)"]);
  assert.equal(out.title, "Issues Log (1)");
  assert.equal(out.renamed, true);
});

test("createWithRetryOnDuplicate retries with (2) after two duplicates", async () => {
  const attempts = [];
  const doCreate = async (title) => {
    attempts.push(title);
    if (title === "Issues Log" || title === "Issues Log (1)") throw dupError();
    return { id: "page-3" };
  };
  const out = await createWithRetryOnDuplicate("Issues Log", doCreate);
  assert.deepEqual(attempts, ["Issues Log", "Issues Log (1)", "Issues Log (2)"]);
  assert.equal(out.title, "Issues Log (2)");
  assert.equal(out.renamed, true);
});

test("createWithRetryOnDuplicate hard-fails after three duplicates with rename guidance", async () => {
  const attempts = [];
  const doCreate = async (title) => {
    attempts.push(title);
    throw dupError();
  };
  await assert.rejects(
    createWithRetryOnDuplicate("Issues Log", doCreate),
    (err) => {
      assert.ok(err.message.includes("Issues Log"), "error mentions base title");
      assert.ok(
        err.message.includes("Issues Log (1)") && err.message.includes("Issues Log (2)"),
        "error lists the suffixed titles that were tried",
      );
      assert.ok(
        err.message.toLowerCase().includes("rename"),
        "error tells the user to rename the source file",
      );
      return true;
    },
  );
  assert.deepEqual(attempts, ["Issues Log", "Issues Log (1)", "Issues Log (2)"]);
});

test("createWithRetryOnDuplicate bubbles non-duplicate errors without retry", async () => {
  const attempts = [];
  const doCreate = async (title) => {
    attempts.push(title);
    throw new Error("Confluence API 500: Internal Server Error");
  };
  await assert.rejects(
    createWithRetryOnDuplicate("Issues Log", doCreate),
    /500/,
  );
  assert.deepEqual(attempts, ["Issues Log"]);
});

test("findOwnedPageByTitle returns the plain title match when present", async () => {
  const lookups = [];
  const doFind = async (title) => {
    lookups.push(title);
    return title === "Issues Log" ? { id: "a", title } : null;
  };
  const out = await findOwnedPageByTitle("Issues Log", doFind);
  assert.deepEqual(lookups, ["Issues Log"]);
  assert.deepEqual(out, { id: "a", title: "Issues Log" });
});

test("findOwnedPageByTitle falls through to (1) when plain is missing", async () => {
  const lookups = [];
  const doFind = async (title) => {
    lookups.push(title);
    return title === "Issues Log (1)" ? { id: "b", title } : null;
  };
  const out = await findOwnedPageByTitle("Issues Log", doFind);
  assert.deepEqual(lookups, ["Issues Log", "Issues Log (1)"]);
  assert.deepEqual(out, { id: "b", title: "Issues Log (1)" });
});

test("findOwnedPageByTitle falls through to (2)", async () => {
  const lookups = [];
  const doFind = async (title) => {
    lookups.push(title);
    return title === "Issues Log (2)" ? { id: "c", title } : null;
  };
  const out = await findOwnedPageByTitle("Issues Log", doFind);
  assert.deepEqual(lookups, ["Issues Log", "Issues Log (1)", "Issues Log (2)"]);
  assert.deepEqual(out, { id: "c", title: "Issues Log (2)" });
});

test("findOwnedPageByTitle returns null when no variant matches within cap", async () => {
  const lookups = [];
  const doFind = async (title) => {
    lookups.push(title);
    return null;
  };
  const out = await findOwnedPageByTitle("Issues Log", doFind);
  assert.equal(out, null);
  assert.deepEqual(lookups, ["Issues Log", "Issues Log (1)", "Issues Log (2)"]);
});
