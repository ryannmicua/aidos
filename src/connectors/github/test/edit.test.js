import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyEdits } from "../edit.js";

describe("applyEdits", () => {
  it("applies a single edit", () => {
    const { newContent, error } = applyEdits(
      "Hello world",
      [{ old_string: "world", new_string: "there" }],
    );
    assert.equal(newContent, "Hello there");
    assert.equal(error, null);
  });

  it("rejects when old_string is not found, and includes a content sample", () => {
    const { newContent, error } = applyEdits(
      "Hello world this is a sample file",
      [{ old_string: "missing", new_string: "replacement" }],
    );
    assert.equal(newContent, null);
    assert.match(error, /old_string not found/i);
    assert.match(error, /Hello world this is a sample file/);
  });

  it("truncates the content sample in the error to ~200 chars", () => {
    const longContent = "x".repeat(500);
    const { error } = applyEdits(
      longContent,
      [{ old_string: "missing", new_string: "y" }],
    );
    // Error message should contain a chunk of x's but not all 500.
    assert.match(error, /xxxx/);
    assert.ok(!error.includes("x".repeat(300)), "sample should be truncated, not include 300 consecutive x's");
  });

  it("rejects when old_string appears multiple times without replace_all", () => {
    const { newContent, error } = applyEdits(
      "foo bar foo baz",
      [{ old_string: "foo", new_string: "qux" }],
    );
    assert.equal(newContent, null);
    assert.match(error, /ambiguous/i);
    assert.match(error, /2 matches/);
  });

  it("replaces all occurrences when replace_all is true", () => {
    const { newContent, error } = applyEdits(
      "foo bar foo baz",
      [{ old_string: "foo", new_string: "qux", replace_all: true }],
    );
    assert.equal(newContent, "qux bar qux baz");
    assert.equal(error, null);
  });

  it("rejects replace_all when zero occurrences", () => {
    const { newContent, error } = applyEdits(
      "hello",
      [{ old_string: "missing", new_string: "x", replace_all: true }],
    );
    assert.equal(newContent, null);
    assert.match(error, /not found/i);
  });

  it("rejects when old_string equals new_string", () => {
    const { newContent, error } = applyEdits(
      "Hello world",
      [{ old_string: "world", new_string: "world" }],
    );
    assert.equal(newContent, null);
    assert.match(error, /identical/i);
  });

  it("applies multiple edits sequentially", () => {
    const { newContent, error } = applyEdits(
      "Hello world",
      [
        { old_string: "Hello", new_string: "Goodbye" },
        { old_string: "Goodbye world", new_string: "Farewell universe" },
      ],
    );
    assert.equal(newContent, "Farewell universe");
    assert.equal(error, null);
  });

  it("rejects a later edit whose old_string doesn't exist after prior edits", () => {
    const { newContent, error } = applyEdits(
      "Hello world",
      [
        { old_string: "world", new_string: "there" },
        { old_string: "world", new_string: "universe" }, // gone after edit 1
      ],
    );
    assert.equal(newContent, null);
    assert.match(error, /edit 2/i);
    assert.match(error, /not found/i);
  });

  it("1-indexes edits in error messages", () => {
    const { error } = applyEdits(
      "abc",
      [{ old_string: "missing", new_string: "x" }],
    );
    assert.match(error, /edit 1/i);
  });

  it("handles multi-line old_string", () => {
    const content = "line one\nline two\nline three\n";
    const { newContent, error } = applyEdits(
      content,
      [{ old_string: "line one\nline two", new_string: "replaced" }],
    );
    assert.equal(newContent, "replaced\nline three\n");
    assert.equal(error, null);
  });
});
