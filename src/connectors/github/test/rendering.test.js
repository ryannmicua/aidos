import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderWorkspaceStatus, renderManifestStatus } from "../server.js";

describe("renderManifestStatus", () => {
  it("prompts to create manifest when missing", () => {
    const out = renderManifestStatus({ manifest_present: false });
    assert.match(out, /manifest\.json is missing/);
    assert.match(out, /default one/);
  });

  it("lists validation errors when present", () => {
    const out = renderManifestStatus({
      manifest_present: true,
      manifest_errors: ["/write: unknown field", "/publish: type mismatch"],
    });
    assert.match(out, /validation errors/);
    assert.match(out, /unknown field/);
    assert.match(out, /type mismatch/);
  });

  it("reports strategy and target when write configured", () => {
    const out = renderManifestStatus({
      manifest_present: true,
      manifest_errors: [],
      write: { strategy: "pr", target: "main" },
      publish_configured: false,
    });
    assert.match(out, /write\.strategy: pr/);
    assert.match(out, /main/);
    assert.match(out, /publish\.confluence: not configured/);
  });

  it("reports reviewers when present", () => {
    const out = renderManifestStatus({
      manifest_present: true,
      manifest_errors: [],
      write: { strategy: "pr", target: "main", reviewers: ["@team-a", "alice"] },
      publish_configured: true,
    });
    assert.match(out, /reviewers: @team-a, alice/);
    assert.match(out, /publish\.confluence configured/);
  });

  it("warns when write config absent", () => {
    const out = renderManifestStatus({
      manifest_present: true,
      manifest_errors: [],
      write: {},
      publish_configured: false,
    });
    assert.match(out, /No write config/);
  });
});

describe("renderWorkspaceStatus", () => {
  const baseWorkspace = {
    repo: "org/my-repo",
    branch: "aidos/simon",
    branch_created: false,
    default_branch: "main",
    work_in_progress: null,
    aidos_folders: [],
  };

  it("offers to create .aidos/ when none exist", () => {
    const out = renderWorkspaceStatus(baseWorkspace);
    assert.match(out, /org\/my-repo/);
    assert.match(out, /aidos\/simon/);
    assert.match(out, /synced with main/);
    assert.match(out, /No \.aidos\/ folders found/);
  });

  it("says created from main when branch_created is true", () => {
    const out = renderWorkspaceStatus({ ...baseWorkspace, branch_created: true });
    assert.match(out, /created from main/);
  });

  it("renders single-folder dashboard", () => {
    const out = renderWorkspaceStatus({
      ...baseWorkspace,
      aidos_folders: [{
        path: ".aidos",
        manifest_present: true,
        manifest_errors: [],
        write: { strategy: "pr", target: "main" },
        publish_configured: false,
      }],
    });
    assert.match(out, /Artifacts folder: \.aidos\//);
    assert.match(out, /Manifest status:/);
    assert.match(out, /Ready to work/);
  });

  it("renders multi-folder disambiguation list", () => {
    const out = renderWorkspaceStatus({
      ...baseWorkspace,
      aidos_folders: [
        { path: ".aidos", manifest_present: true, write: { strategy: "pr", target: "main" } },
        { path: "services/auth/.aidos", manifest_present: true, write: { strategy: "pr", target: "develop" } },
        { path: "packages/a/.aidos", manifest_present: false, write: {} },
      ],
    });
    assert.match(out, /Found 3 artifact folders/);
    assert.match(out, /\.aidos\/ — write: pr → main/);
    assert.match(out, /services\/auth\/\.aidos\/ — write: pr → develop/);
    assert.match(out, /packages\/a\/\.aidos\/ — no manifest/);
    assert.match(out, /Which one do you want to work with/);
  });

  it("renders work-in-progress section", () => {
    const out = renderWorkspaceStatus({
      ...baseWorkspace,
      work_in_progress: {
        ahead: 3,
        files: [
          { filename: ".aidos/problem.md", status: "modified" },
          { filename: ".aidos/solution.md", status: "added" },
        ],
      },
      aidos_folders: [{ path: ".aidos", manifest_present: true, manifest_errors: [], write: { strategy: "pr", target: "main" }, publish_configured: false }],
    });
    assert.match(out, /3 commits ahead of main/);
    assert.match(out, /problem\.md \(modified\)/);
    assert.match(out, /solution\.md \(added\)/);
    assert.match(out, /start fresh/);
  });
});

describe("renderManifestStatus — staged strategy", () => {
  it("shows rolling PR URL and state when present", () => {
    const folder = {
      manifest_present: true,
      manifest_errors: [],
      write: { strategy: "staged", target: "main", staging_branch: "aidos" },
      publish_configured: true,
      rolling_pr: { number: 42, url: "https://github.com/org/repo/pull/42", state: "open" },
    };
    const output = renderManifestStatus(folder);
    assert.match(output, /write\.strategy: staged/);
    assert.match(output, /rolling PR #42/);
    assert.match(output, /https:\/\/github\.com\/org\/repo\/pull\/42/);
  });

  it("notes no rolling PR when none exists yet", () => {
    const folder = {
      manifest_present: true,
      manifest_errors: [],
      write: { strategy: "staged", target: "main", staging_branch: "aidos" },
      publish_configured: true,
      rolling_pr: null,
    };
    const output = renderManifestStatus(folder);
    assert.match(output, /no rolling PR yet/i);
  });

  it("renders staging_branch in the strategy line", () => {
    const folder = {
      manifest_present: true,
      manifest_errors: [],
      write: { strategy: "staged", target: "main", staging_branch: "docs-staging" },
      publish_configured: false,
    };
    const output = renderManifestStatus(folder);
    assert.match(output, /staging: docs-staging → main/);
  });
});
