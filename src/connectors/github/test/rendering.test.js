import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderWorkspaceStatus, renderManifestStatus } from "../server.js";

describe("renderManifestStatus", () => {
  it("prompts to create manifest when missing", () => {
    const out = renderManifestStatus({ manifest_present: false });
    assert.match(out, /manifest\.json is missing/);
    assert.match(out, /empty one/);
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

  it("confirms valid manifest without publish config", () => {
    const out = renderManifestStatus({
      manifest_present: true,
      manifest_errors: [],
      publish_configured: false,
    });
    assert.match(out, /manifest\.json is valid/);
    assert.match(out, /publish\.confluence: not configured/);
  });

  it("reports publish.confluence when configured", () => {
    const out = renderManifestStatus({
      manifest_present: true,
      manifest_errors: [],
      publish_configured: true,
    });
    assert.match(out, /publish\.confluence configured/);
  });
});

describe("renderWorkspaceStatus", () => {
  const baseWorkspace = {
    repo: "org/my-repo",
    branch: "aidos",
    branch_created: false,
    default_branch: "main",
    work_in_progress: null,
    aidos_folders: [],
    rolling_pr: null,
  };

  it("offers to create .aidos/ when none exist", () => {
    const out = renderWorkspaceStatus(baseWorkspace);
    assert.match(out, /org\/my-repo/);
    assert.match(out, /aidos/);
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
        publish_configured: false,
      }],
    });
    assert.match(out, /Artifacts folder: \.aidos\//);
    assert.match(out, /Manifest status:/);
    assert.match(out, /Ready to work/);
  });

  it("renders rolling PR line when present", () => {
    const out = renderWorkspaceStatus({
      ...baseWorkspace,
      aidos_folders: [{
        path: ".aidos",
        manifest_present: true,
        manifest_errors: [],
        publish_configured: false,
      }],
      rolling_pr: { number: 42, url: "https://github.com/org/my-repo/pull/42", state: "open" },
    });
    assert.match(out, /Rolling PR #42/);
    assert.match(out, /https:\/\/github\.com\/org\/my-repo\/pull\/42/);
  });

  it("renders multi-folder disambiguation list without strategy/target", () => {
    const out = renderWorkspaceStatus({
      ...baseWorkspace,
      aidos_folders: [
        { path: ".aidos", manifest_present: true, publish_configured: true },
        { path: "services/auth/.aidos", manifest_present: true, publish_configured: false },
        { path: "packages/a/.aidos", manifest_present: false, publish_configured: false },
      ],
    });
    assert.match(out, /Found 3 artifact folders/);
    assert.match(out, /\.aidos\/ — manifest \+ confluence configured/);
    assert.match(out, /services\/auth\/\.aidos\/ — manifest only/);
    assert.match(out, /packages\/a\/\.aidos\/ — no manifest/);
    assert.match(out, /Which one do you want to work with/);
    // Absolutely must not reference strategy/target
    assert.doesNotMatch(out, /write:/);
    assert.doesNotMatch(out, /strategy/);
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
      aidos_folders: [{ path: ".aidos", manifest_present: true, manifest_errors: [], publish_configured: false }],
    });
    assert.match(out, /3 commits ahead of main/);
    assert.match(out, /problem\.md \(modified\)/);
    assert.match(out, /solution\.md \(added\)/);
    assert.match(out, /start fresh/);
  });

  it("renders sync_conflict with pointer to resolve tool (not publish)", () => {
    const out = renderWorkspaceStatus({
      ...baseWorkspace,
      sync_conflict: { conflicts: [{ path: "x.md" }] },
      aidos_folders: [{ path: ".aidos", manifest_present: true, manifest_errors: [], publish_configured: false }],
    });
    assert.match(out, /file\(s\) conflict/);
    assert.match(out, /Call resolve/);
    assert.doesNotMatch(out, /Call publish/);
  });
});
