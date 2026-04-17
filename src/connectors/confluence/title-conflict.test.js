import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_TITLE_ATTEMPTS } from "./title-conflict.js";

test("MAX_TITLE_ATTEMPTS is 3", () => {
  assert.equal(MAX_TITLE_ATTEMPTS, 3);
});
