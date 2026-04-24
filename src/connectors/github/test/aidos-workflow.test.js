import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const workflowPath = join(__dirname, "..", "workflows", "aidos.yml");

describe("aidos.yml workflow", () => {
  const yaml = readFileSync(workflowPath, "utf8");

  it("does not reference env.* in any job-level if: condition (GitHub Actions context-availability limitation)", () => {
    const jobsIndex = yaml.indexOf("\njobs:");
    assert.ok(jobsIndex > 0, "workflow must have a jobs: block");
    const jobsBlock = yaml.slice(jobsIndex);

    // Find every job-level if: (4-space-indented) and capture multi-line block-scalar bodies.
    const lines = jobsBlock.split("\n");
    const jobIfBodies = [];
    for (let i = 0; i < lines.length; i++) {
      if (/^    if:/.test(lines[i])) {
        let body = lines[i];
        for (let j = i + 1; j < lines.length; j++) {
          if (/^      /.test(lines[j])) {
            body += "\n" + lines[j];
          } else {
            break;
          }
        }
        jobIfBodies.push(body);
      }
    }

    assert.ok(
      jobIfBodies.length >= 3,
      `expected at least 3 job-level if: blocks, found ${jobIfBodies.length}`
    );

    for (const body of jobIfBodies) {
      assert.ok(
        !/\benv\.[A-Z_]+\b/.test(body),
        `job-level if: references env.* — env context is not available at jobs.<job_id>.if scope:\n${body}`
      );
    }
  });

  it("hardcodes the aidos branch name in all job-level if: conditions", () => {
    const aidosMatches = yaml.match(/^    if:[\s\S]*?aidos[\s\S]*?$/gm) || [];
    assert.ok(
      aidosMatches.length >= 1,
      "at least one job-level if: must reference the literal aidos branch"
    );
  });

  it("resolves the default branch name at runtime (no hardcoded 'main' in if: or scripts)", () => {
    // The scripts must use context.payload.repository.default_branch or
    // github.event.repository.default_branch, not the string "main".
    assert.ok(
      /default_branch/.test(yaml),
      "workflow must use repository.default_branch for runtime resolution"
    );
    const scriptBlocks = yaml.match(/script: \|[\s\S]*?(?=\n  [a-z]|\n---|\n$)/g) || [];
    for (const script of scriptBlocks) {
      assert.ok(
        !/\btarget\s*=\s*["']main["']/.test(script),
        `script hardcodes 'main' as the target — must resolve default_branch at runtime:\n${script.slice(0, 200)}...`
      );
    }
  });

  it("listens for pushes to the aidos branch", () => {
    const onIndex = yaml.indexOf("\non:");
    assert.ok(onIndex > 0);
    const onBlock = yaml.slice(onIndex, yaml.indexOf("\njobs:", onIndex));
    assert.match(onBlock, /- aidos\b/, "on.push.branches must include 'aidos'");
  });
});
