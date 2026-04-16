# AIDOS Versioning and Migrations

## Overview

AIDOS needs a versioning scheme so that artifacts created under one version of the framework can be safely upgraded when templates, naming conventions, or structure change. The design treats versioning as a pure framework concern — artifacts are self-describing, upgrades happen per-file, and nothing depends on the GitHub MCP connector, Confluence connector, or any other tooling. AIDOS must work identically for users working directly in Claude Code, through the MCP connector, or by pasting prompts into claude.ai.

## Version Scheme

Semver `vX.Y.Z` applied to the AIDOS framework repo via git tags.

| Segment | Meaning | Migration? | Example |
|---|---|---|---|
| Patch (Z) | Rubric wording, prompt tweaks, clarifications. No structural change. | No | v1.0.0 → v1.0.1 |
| Minor (Y) | Template structure, naming conventions, artifact shape changes. | Yes — documented in natural language | v1.0.0 → v1.1.0 |
| Major (X) | Reserved. A new era of AIDOS that owns its own migration story. | N/A — not planned | v1.0.0 → v2.0.0 |

The initial release is `v1.0.0`, representing the current state of the framework before any migrations exist. All artifacts created before versioning was introduced are treated as v1.0.0.

## Where the Version Lives

Each artifact file carries its own `AIDOS Version` in its metadata block:

```markdown
# Problem: Portfolio Analytics

**Status:** DRAFT
**AIDOS Version:** 1.0.0

---
```

This is called **AIDOS Version** — not just "Version" — because it's the framework spec version this file was written against. It is not the artifact's own revision number.

### Why per-file, not per-workspace

- **Self-describing** — each file carries its own version. Move it, copy it, paste it into a different repo — it still knows what spec it was written against.
- **No external dependency** — no manifest, no `.aidos/version` file, no connector required. The file is the source of truth about itself.
- **Controlled blast radius** — a session typically works on one file at a time. Upgrading `Problem.md` doesn't touch `Solution.md`. Files are migrated as they're touched.
- **Gradual adoption** — a workspace can have files at mixed versions. The ones actively being iterated on get upgraded; the rest stay put until someone opens them.

### Missing field

If a file's metadata has no `AIDOS Version` field (pre-versioning artifacts), the skill treats it as v1.0.0.

## Per-File Version Check

The builder and auditor skills carry the current framework version as a string constant in the skill file.

When a skill opens an artifact file, it reads the `AIDOS Version` from the metadata block and compares it against the skill's own version.

| State | Example | Behaviour |
|---|---|---|
| Match | File 1.2.0, skill 1.2.0 | Silent. No message. |
| File behind (patch only) | File 1.0.0, skill 1.0.2 | Silent. No action needed. |
| File behind (minor+) | File 1.0.0, skill 1.2.0 | Warn: "This file is on AIDOS v1.0.0. Current framework is v1.2.0 — migration available. Want me to upgrade this file?" Skill proceeds either way. |
| File ahead (patch) | File 1.2.1, skill 1.2.0 | Soft warning: "This file was created with a newer patch (v1.2.1). Proceed with caution." Skill proceeds. |
| File ahead (minor+) | File 1.3.0, skill 1.2.0 | Hard block: "This file requires AIDOS v1.3.0+. Upgrade your skill before editing." Skill refuses to modify the file. |

### Auditor behaviour

The auditor runs the same check when reviewing a file. If the file is behind, it warns before auditing: "This file is on v1.0.0, current rubric is v1.2.0. Audit results may reference criteria that don't match this file's structure."

The auditor does not execute migrations — that's the builder's job. The auditor only reports the mismatch so the user understands the context of the audit.

## Migration Files

Migration instructions live in the framework at `src/migrations/`, one file per minor bump:

```
src/migrations/
  v1.0.0-to-v1.1.0.md
  v1.1.0-to-v1.2.0.md
  v1.2.0-to-v1.3.0.md
```

### Format

Each migration file uses a standard structure with three fixed sections, each present only when applicable:

```markdown
# Migration v1.0.0 → v1.1.0

## Summary
Brief human-readable description of what changed and why.

## File renames
- `Problem.md` → `1. Problem.md`
- `Solution.md` → `2. Solution.md`
- `Tech Design.md` → `3. Tech Design.md`
- `Test Strategy.md` → `4. Test Strategy.md`

## Content changes
- In `1. Problem.md`, rename the heading "## Business Context" to "## Context"

## Metadata changes
None.
```

The consumer of these instructions is always an AI agent (the skill or a Claude Code session). Natural language is the right format — it handles structural changes (renames) and content-level changes (heading rewrites, section moves) without inventing a DSL.

### Per-file scope

When a migration is applied to a single file, the skill only executes the instructions relevant to that file. For example, if the migration renames `Problem.md` → `1. Problem.md` and the user is working on `Solution.md`, the rename isn't triggered. Only the changes that affect `Solution.md` are applied.

### Chaining

If a file is on v1.0.0 and the current framework is v1.3.0, the upgrade runs migrations sequentially:

1. v1.0.0 → v1.1.0
2. v1.1.0 → v1.2.0
3. v1.2.0 → v1.3.0

Each step is presented to the user for signoff before proceeding to the next. The file's `AIDOS Version` metadata is updated after each successful step. The user can stop partway through and the file accurately reflects how far the migration got.

## Upgrade Flow

Triggered by the builder skill when it opens a file that's behind. The skill asks the user whether to upgrade before doing anything. The user can decline and continue working on the stale version (subject to the hard-block rule for files that are ahead).

1. **Read the file** — extract `AIDOS Version` from the metadata block.
2. **Detect gap** — compare against the skill's framework version.
3. **Offer upgrade** — ask the user whether to migrate this file.
4. **Resolve migration chain** — find all migration files from file version to skill version, in order.
5. **For each migration step, for this file:**
   - Display the migration summary to the user.
   - Execute only the instructions that affect this file (renames, content changes, metadata updates).
   - Present a diff for user signoff.
   - On approval: update the `AIDOS Version` line in the file to the step's target version.
   - On rejection: stop. The file reflects the last successful step.
6. **Done** — confirm the final version to the user.

The whole flow runs inside the skill's session. No external tool, no MCP call, no connector required. Works identically in Claude Code (direct filesystem), Claude Desktop with the MCP connector, or any other environment.

## Release Tagging

When cutting a framework release:

- Tag the repo with the version (e.g. `v1.1.0`).
- The git tag is the canonical reference for all consumers.
- The Confluence connector GitHub Action is consumed at `@v1.1.0` — no `@latest`, no `@sha`.
- Update the framework version constant in the builder and auditor skills as part of the release.

### Org-Restricted Environments

Some organisations block public GitHub Actions. For these environments:

- The Confluence publish workflow must be vendored or rewritten internally.
- The AIDOS version in artifact files tells the org which upstream release their internal workflow should align with.
- The Confluence connector README documents this pattern: how to vendor/rewrite the workflow, and how to track upstream version alignment.

## Developer Guardrail

A section in the repo's `CLAUDE.md` ensures any AI session working on AIDOS itself considers migration impact:

```markdown
## Migrations

When modifying templates, rubrics, naming conventions, or artifact structure
in `src/prompts/`, `src/templates/`, or `skills/`:

1. Determine if the change affects the structure or naming of generated
   artifacts. If yes, this is a minor version bump.
2. Create a migration file at `src/migrations/vX.Y.Z-to-vX.Y+1.0.md`
   following the format in existing migration files.
3. Update the framework version constant in the builder and auditor skills.
4. Update the `AIDOS Version` default in the artifact templates.
5. If the change is wording-only with no structural impact, it's a patch
   bump. No migration file needed.
```

## Components Touched

| Component | Change |
|---|---|
| `src/templates/*.md` | Add `**AIDOS Version:** 1.0.0` line in the metadata block of each artifact template |
| `src/migrations/` | New directory; first migration file when v1.1.0 ships |
| Builder skill | Version constant, per-file version check, in-session upgrade flow |
| Auditor skill | Version constant, per-file version check (read-only, warn on mismatch) |
| `CLAUDE.md` | Developer migration guardrail section |
| Confluence connector README | Org-restricted environments guidance, tag pinning |

## Explicitly Out of Scope

- **`manifest.json` is not touched by this design.** Versioning is a framework concern; the manifest is connector configuration. They stay separate.
- **No cross-file migration coordination.** Each file migrates independently. A workspace can have mixed versions, and that's fine.
- **No rollback tool.** If a user wants to revert a migration, they use git. The upgrade flow is forward-only.
