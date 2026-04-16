# AIDOS Versioning and Migrations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce per-artifact AIDOS framework versioning, natural-language migration files, and in-skill upgrade flows so artifacts can be safely evolved across framework releases.

**Architecture:** The framework version is carried in each artifact file's metadata block (`**AIDOS Version:** X.Y.Z`). A `VERSION` file at the framework root is the single source of truth for "what version is this skill". Migration instructions live in `src/migrations/` as markdown files. The builder skill reads them when it opens a file that's behind and offers a per-file upgrade. The auditor reads them only to warn. No connector, manifest, or external tooling is involved.

**Tech Stack:** Markdown (artifact templates, prompts, migration files). PowerShell (`build.ps1` for skill packaging). No runtime code changes — this is a framework + skill-prompt change.

---

## Spec Reference

Spec: `docs/superpowers/specs/2026-04-16-versioning-and-migrations-design.md`

## File Structure

**Created:**
- `VERSION` — single source of truth for current framework version (plain text, e.g. `1.0.0`)
- `src/migrations/README.md` — explains migration file format and intent
- `src/migrations/.gitkeep` — keeps the directory in git until first migration lands

**Modified:**
- `src/templates/problem.md` — add `**AIDOS Version:** 1.0.0` to metadata block
- `src/templates/solution.md` — add `**AIDOS Version:** 1.0.0` to metadata block
- `src/templates/tech-design.md` — add `**AIDOS Version:** 1.0.0` to metadata block
- `src/templates/testing.md` — add `**AIDOS Version:** 1.0.0` to metadata block
- `src/templates/definition.md` — add `**AIDOS Version:** 1.0.0` to metadata block
- `src/prompts/builder-prompt.md` — add Versioning section (version check, upgrade flow, template stamping)
- `src/prompts/auditor-prompt.md` — add Versioning section (warn-only check)
- `skills/builder/SKILL.md` — reference `VERSION` file in Included Files table
- `skills/auditor/SKILL.md` — reference `VERSION` file in Included Files table
- `skills/build.ps1` — copy `VERSION` and `src/migrations/` into both skill bundles
- `CLAUDE.md` — add Migrations section (developer guardrail)
- `src/connectors/confluence/README.md` — add tag-pinning guidance and org-restricted environments section

## Task Granularity Rule

Most tasks in this plan are markdown edits. "Testing" is grep-based verification of the edit, because the skill behaviour itself is LLM-driven and can only be manually validated. Where a task has genuine behavioural testing implications, the manual verification step is clearly marked.

---

## Task 1: Create the VERSION file

**Files:**
- Create: `VERSION`

- [ ] **Step 1: Create the VERSION file**

Create `C:\code\repos\aidos\VERSION` with exactly one line:

```
1.0.0
```

No trailing newline is fine. Plain text, no YAML, no JSON.

- [ ] **Step 2: Verify the file exists and has the right content**

Run:
```bash
cat C:/code/repos/aidos/VERSION
```
Expected: prints `1.0.0`.

- [ ] **Step 3: Commit**

```bash
git add VERSION
git commit -m "feat(versioning): add VERSION file as framework version source of truth"
```

---

## Task 2: Scaffold the migrations directory

**Files:**
- Create: `src/migrations/README.md`
- Create: `src/migrations/.gitkeep`

- [ ] **Step 1: Create the .gitkeep placeholder**

Create `C:\code\repos\aidos\src\migrations\.gitkeep` as an empty file. This keeps the directory in git until the first real migration lands (v1.0.0 → v1.1.0).

- [ ] **Step 2: Write the migrations README**

Create `C:\code\repos\aidos\src\migrations\README.md`. The file content is everything between the two `====` markers below. Do not include the `====` markers themselves:

====
# AIDOS Migrations

Migration files describe how to upgrade an AIDOS artifact from one framework version to the next. One file per minor version bump.

## File naming

`vX.Y.Z-to-vX.Y+1.0.md` — e.g. `v1.0.0-to-v1.1.0.md`, `v1.1.0-to-v1.2.0.md`.

Patch bumps (v1.0.0 → v1.0.1) never have migrations. Patches are wording-only.

## File format

Each migration is a markdown file with a title and up to four sections. Sections are present only when they apply. Example:

```
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

## Who reads these files

The AIDOS builder skill, when it opens an artifact file whose `AIDOS Version` is behind the current framework version. It reads the relevant migration files, applies them to the file in question (only the parts that affect that file), presents a diff for user signoff, then updates the file's `AIDOS Version` metadata.

The AIDOS auditor skill reads these files only to report the version gap. It does not execute migrations.

## Who writes these files

Any developer (human or AI) who changes the structure, naming, or shape of AIDOS artifacts. The developer guardrail in the repo's `CLAUDE.md` reminds contributors to create a migration file for any minor-version change.

## Scope rule

Instructions should be written so an AI agent can apply them to a single file at a time. A workspace can have files at mixed versions — each file migrates independently as the user opens it.
====

- [ ] **Step 3: Verify**

Run:
```bash
ls C:/code/repos/aidos/src/migrations/
```
Expected output includes `.gitkeep` and `README.md`.

- [ ] **Step 4: Commit**

```bash
git add src/migrations/.gitkeep src/migrations/README.md
git commit -m "feat(versioning): scaffold src/migrations/ with README"
```

---

## Task 3: Add AIDOS Version to the Problem template

**Files:**
- Modify: `src/templates/problem.md:56-60`

- [ ] **Step 1: Read the current metadata block**

Open `C:\code\repos\aidos\src\templates\problem.md` and find lines 56–60. They currently read:

```markdown
# Problem: [title]

**Status:** DRAFT | REVIEW | ACCEPTED
**Parent:** [link to Epic problem, if this is Feature or Story scale]
```

- [ ] **Step 2: Add the AIDOS Version line**

Change those lines to:

```markdown
# Problem: [title]

**Status:** DRAFT | REVIEW | ACCEPTED
**AIDOS Version:** 1.0.0
**Parent:** [link to Epic problem, if this is Feature or Story scale]
```

Note: `Parent` stays. The brainstorming discussion about removing it was limited to the in-line example, not a template change.

- [ ] **Step 3: Verify**

Run:
```bash
grep -n "AIDOS Version" C:/code/repos/aidos/src/templates/problem.md
```
Expected: one match on line 59 (or nearby) showing `**AIDOS Version:** 1.0.0`.

- [ ] **Step 4: Commit**

```bash
git add src/templates/problem.md
git commit -m "feat(versioning): add AIDOS Version metadata to Problem template"
```

---

## Task 4: Add AIDOS Version to the Solution template

**Files:**
- Modify: `src/templates/solution.md:51-54`

- [ ] **Step 1: Read the current metadata block**

Find the metadata block near line 51–54:

```markdown
# Solution: [title]

**Status:** DRAFT | REVIEW | ACCEPTED
**Problem:** [link to Problem artifact]
```

- [ ] **Step 2: Add the AIDOS Version line**

Change to:

```markdown
# Solution: [title]

**Status:** DRAFT | REVIEW | ACCEPTED
**AIDOS Version:** 1.0.0
**Problem:** [link to Problem artifact]
```

- [ ] **Step 3: Verify**

Run:
```bash
grep -n "AIDOS Version" C:/code/repos/aidos/src/templates/solution.md
```
Expected: one match showing `**AIDOS Version:** 1.0.0`.

- [ ] **Step 4: Commit**

```bash
git add src/templates/solution.md
git commit -m "feat(versioning): add AIDOS Version metadata to Solution template"
```

---

## Task 5: Add AIDOS Version to the Tech Design template

**Files:**
- Modify: `src/templates/tech-design.md:52-55`

- [ ] **Step 1: Read the current metadata block**

Find the metadata block near line 52–55:

```markdown
# Tech Design: [title]

**Status:** DRAFT | REVIEW | ACCEPTED
**Solution:** [link to Solution artifact]
```

- [ ] **Step 2: Add the AIDOS Version line**

Change to:

```markdown
# Tech Design: [title]

**Status:** DRAFT | REVIEW | ACCEPTED
**AIDOS Version:** 1.0.0
**Solution:** [link to Solution artifact]
```

- [ ] **Step 3: Verify**

Run:
```bash
grep -n "AIDOS Version" C:/code/repos/aidos/src/templates/tech-design.md
```
Expected: one match showing `**AIDOS Version:** 1.0.0`.

- [ ] **Step 4: Commit**

```bash
git add src/templates/tech-design.md
git commit -m "feat(versioning): add AIDOS Version metadata to Tech Design template"
```

---

## Task 6: Add AIDOS Version to the Testing template

**Files:**
- Modify: `src/templates/testing.md:76-80`

- [ ] **Step 1: Read the current metadata block**

Find the metadata block near line 76–80:

```markdown
# Testing: [title]

**Status:** DRAFT | REVIEW | ACCEPTED
**Tech Design:** [link to Tech Design artifact]
**Solution:** [link to Solution artifact]
```

- [ ] **Step 2: Add the AIDOS Version line**

Change to:

```markdown
# Testing: [title]

**Status:** DRAFT | REVIEW | ACCEPTED
**AIDOS Version:** 1.0.0
**Tech Design:** [link to Tech Design artifact]
**Solution:** [link to Solution artifact]
```

- [ ] **Step 3: Verify**

Run:
```bash
grep -n "AIDOS Version" C:/code/repos/aidos/src/templates/testing.md
```
Expected: one match showing `**AIDOS Version:** 1.0.0`.

- [ ] **Step 4: Commit**

```bash
git add src/templates/testing.md
git commit -m "feat(versioning): add AIDOS Version metadata to Testing template"
```

---

## Task 7: Add AIDOS Version to the Definition template

**Files:**
- Modify: `src/templates/definition.md:53-55`

- [ ] **Step 1: Read the current metadata block**

Find the metadata block near line 53–55:

```markdown
# Definition: [title]

**Status:** DRAFT | REVIEW | ACCEPTED | CURRENT
```

- [ ] **Step 2: Add the AIDOS Version line**

Change to:

```markdown
# Definition: [title]

**Status:** DRAFT | REVIEW | ACCEPTED | CURRENT
**AIDOS Version:** 1.0.0
```

- [ ] **Step 3: Verify**

Run:
```bash
grep -n "AIDOS Version" C:/code/repos/aidos/src/templates/definition.md
```
Expected: one match showing `**AIDOS Version:** 1.0.0`.

- [ ] **Step 4: Commit**

```bash
git add src/templates/definition.md
git commit -m "feat(versioning): add AIDOS Version metadata to Definition template"
```

---

## Task 8: Verify all five primary templates have the version field

**Files:** None modified — this is a checkpoint.

- [ ] **Step 1: Run a consolidated grep**

Run:
```bash
grep -rn "AIDOS Version" C:/code/repos/aidos/src/templates/
```
Expected: five matches, one each in `problem.md`, `solution.md`, `tech-design.md`, `testing.md`, `definition.md`.

If any are missing, go back to the relevant task and fix.

Note: `issues-log.md`, `overflow-log.md`, `meeting-minutes.md`, `retrospective.md` are **deliberately excluded** — they're logs/support files, not rubric-governed artifacts, so they don't carry AIDOS Version.

---

## Task 9: Add Versioning section to the builder prompt

**Files:**
- Modify: `src/prompts/builder-prompt.md` — add a new `## Versioning` section after the existing `## Environment` section (before `## Session Start`)

- [ ] **Step 1: Find the insertion point**

Open `C:\code\repos\aidos\src\prompts\builder-prompt.md`. The current structure is:
- Line 28: `## Environment`
- Line 42: `## Session Start`

The new `## Versioning` section goes between them.

- [ ] **Step 2: Insert the Versioning section**

Immediately before line 42 (`## Session Start`), after the existing Environment section closes with `---`, insert:

```markdown
## Versioning

Every artifact template carries an `**AIDOS Version:** X.Y.Z` line in its metadata block. This records which version of the AIDOS framework spec the file was written against. It is the framework spec version — not the artifact's own revision number.

The current framework version is stored in the `VERSION` file bundled with this skill (read it on start). When you scaffold new artifacts, stamp them with the version from `VERSION`. When you open an existing artifact, read the `AIDOS Version` from its metadata and compare to `VERSION`.

Comparison rules:

| File state | Example | Action |
|---|---|---|
| Match | File 1.2.0, skill 1.2.0 | Silent. Proceed. |
| Behind, patch only | File 1.0.0, skill 1.0.2 | Silent. Proceed. |
| Behind, minor or more | File 1.0.0, skill 1.2.0 | Warn the user: "This file is on AIDOS v1.0.0. Current framework is v1.2.0 — a migration is available. Want me to upgrade this file?" Proceed whether they accept or decline. |
| Ahead, patch only | File 1.2.1, skill 1.2.0 | Soft warning: "This file was created with a newer patch (v1.2.1). Proceed with caution." Proceed. |
| Ahead, minor or more | File 1.3.0, skill 1.2.0 | Hard block. Refuse to modify. Tell the user: "This file requires AIDOS v1.3.0+. Upgrade your AIDOS skill before editing." |

If a file has no `AIDOS Version` field, treat it as v1.0.0 and follow the rules above.

### Per-file upgrade flow

When a file is behind (minor or more) and the user accepts the upgrade offer:

1. Read the migration files from `src/migrations/` in the bundled skill content that sit between the file's version and the current `VERSION`.
2. For each migration step, in version order:
   - Show the user the migration's `Summary` section.
   - Apply only the instructions that affect the file in question — `File renames` entries whose source matches, `Content changes` entries that target this file, `Metadata changes` that apply to this file.
   - Present the resulting diff.
   - Get explicit user approval before writing.
   - On approval: write the changes and update the file's `**AIDOS Version:**` line to the step's target version.
   - On rejection: stop. The file keeps the last successfully applied version.
3. After the last step (or early stop), confirm the final version to the user.

Each file migrates independently. A workspace can have files at mixed versions — this is expected and fine.

### Stamping new artifacts

When scaffolding a new artifact from a template, the template already contains `**AIDOS Version:** 1.0.0` as a placeholder. Replace it with the current version from `VERSION` before saving. If they happen to match, no change is needed.

---
```

- [ ] **Step 3: Verify**

Run:
```bash
grep -n "^## Versioning\|^## Session Start\|^## Environment" C:/code/repos/aidos/src/prompts/builder-prompt.md
```
Expected: `## Environment` followed by `## Versioning` followed by `## Session Start`, in that order.

- [ ] **Step 4: Commit**

```bash
git add src/prompts/builder-prompt.md
git commit -m "feat(versioning): add Versioning section to builder prompt"
```

---

## Task 10: Add Versioning section to the auditor prompt

**Files:**
- Modify: `src/prompts/auditor-prompt.md` — add a new `## Versioning` section

- [ ] **Step 1: Find the insertion point**

Open `C:\code\repos\aidos\src\prompts\auditor-prompt.md`. Locate the existing `## Environment` section and the next top-level section after it (likely `## Session Start` or equivalent). The new `## Versioning` section goes between them.

Run to confirm structure:
```bash
grep -n "^## " C:/code/repos/aidos/src/prompts/auditor-prompt.md | head -10
```

- [ ] **Step 2: Insert the Versioning section**

Immediately after the `## Environment` section's closing `---`, insert:

```markdown
## Versioning

The AIDOS framework is versioned — see the `VERSION` file bundled with this skill for the current version. Each artifact file records the version it was written against in its metadata block as `**AIDOS Version:** X.Y.Z`.

Before auditing, read the file's `AIDOS Version` and compare to the skill's `VERSION`.

| File state | Action |
|---|---|
| Match | Audit normally. No message. |
| Behind, patch only | Audit normally. No message. |
| Behind, minor or more | Before delivering findings, warn: "This file is on AIDOS v<file-version>. Current rubric is v<skill-version>. Audit results may reference criteria or structure that don't match this file. Consider running `/aidos-builder` to upgrade the file first." Then audit against the current rubric. |
| Ahead, patch only | Soft warning: "This file was created with a newer patch (v<file-version>). Audit proceeds against v<skill-version> rubric." Then audit. |
| Ahead, minor or more | Hard block. Refuse to audit. Tell the user: "This file requires AIDOS v<file-version>+ to audit accurately. Upgrade your AIDOS skill before auditing." |

If the file has no `AIDOS Version` field, treat it as v1.0.0.

You are read-only. Do not execute migrations. Do not modify files. The builder handles upgrades in a separate session.

---
```

- [ ] **Step 3: Verify**

Run:
```bash
grep -n "^## Versioning" C:/code/repos/aidos/src/prompts/auditor-prompt.md
```
Expected: one match, and it appears between `## Environment` and the next top-level section.

- [ ] **Step 4: Commit**

```bash
git add src/prompts/auditor-prompt.md
git commit -m "feat(versioning): add Versioning section to auditor prompt"
```

---

## Task 11: Update builder SKILL.md to reference VERSION and migrations

**Files:**
- Modify: `skills/builder/SKILL.md` — add `VERSION` and `migrations/README.md` rows to the Included Files table

- [ ] **Step 1: Locate the Included Files table**

Open `C:\code\repos\aidos\skills\builder\SKILL.md`. The table starts near line 22 with `| File | Purpose |`.

- [ ] **Step 2: Add two new rows at the end of the table**

After the existing `CONTRIBUTING.md` row (line 36), insert two new rows before the `## Environment` header (line 38):

```markdown
| `VERSION` | **Framework version.** Plain-text file containing the current AIDOS framework semver (e.g. `1.0.0`). Read on session start — used to stamp new artifacts and compare against existing files' `AIDOS Version` metadata. |
| `migrations/` | Directory of `vX.Y.Z-to-vX.Y+1.0.md` files describing how to upgrade artifacts across minor framework bumps. Read only when a file is behind and the user accepts an upgrade. |
```

- [ ] **Step 3: Verify**

Run:
```bash
grep -n "VERSION\|migrations" C:/code/repos/aidos/skills/builder/SKILL.md
```
Expected: at least one match for `VERSION` and one for `migrations`.

- [ ] **Step 4: Commit**

```bash
git add skills/builder/SKILL.md
git commit -m "docs(versioning): document VERSION and migrations in builder SKILL.md"
```

---

## Task 12: Update auditor SKILL.md to reference VERSION

**Files:**
- Modify: `skills/auditor/SKILL.md` — add `VERSION` row to Included Files table

- [ ] **Step 1: Locate the Included Files table**

Open `C:\code\repos\aidos\skills\auditor\SKILL.md`. The table starts near line 22.

- [ ] **Step 2: Add a new row**

After the existing `CONTRIBUTING.md` row, before the `## Environment` section header, insert:

```markdown
| `VERSION` | **Framework version.** Plain-text file containing the current AIDOS framework semver (e.g. `1.0.0`). Read on session start — used to compare against the audited file's `AIDOS Version` metadata. |
```

Note: the auditor does not include `migrations/` because the auditor only warns about version gaps; it never reads migration instructions.

- [ ] **Step 3: Verify**

Run:
```bash
grep -n "VERSION" C:/code/repos/aidos/skills/auditor/SKILL.md
```
Expected: at least one match.

- [ ] **Step 4: Commit**

```bash
git add skills/auditor/SKILL.md
git commit -m "docs(versioning): document VERSION in auditor SKILL.md"
```

---

## Task 13: Update build.ps1 to bundle VERSION and migrations into skill ZIPs

**Files:**
- Modify: `skills/build.ps1` — add copy lines for VERSION and migrations directory; update Fix-PromptPaths if needed

- [ ] **Step 1: Add VERSION copy line for Builder**

Open `C:\code\repos\aidos\skills\build.ps1`. Find the Builder copy block (lines 52–68). After line 68 (the `CONTRIBUTING.md` copy), add:

```powershell
    Copy-To (Join-Path $root "VERSION")                            (Join-Path $b "VERSION")
```

- [ ] **Step 2: Add migrations directory copy for Builder**

Immediately after the VERSION copy line above, add a loop that copies any files from `src/migrations/` into the bundle:

```powershell
    $migSrc = Join-Path $root "src\migrations"
    if (Test-Path $migSrc) {
        Get-ChildItem $migSrc -File | ForEach-Object {
            Copy-To $_.FullName (Join-Path $b "migrations\$($_.Name)")
        }
    }
```

This copies `README.md` today; when `v1.0.0-to-v1.1.0.md` lands later, it'll pick that up too. `.gitkeep` is fine to bundle but adds nothing useful — the `Get-ChildItem ... -File` picks it up harmlessly.

- [ ] **Step 3: Add VERSION copy line for Auditor**

Find the Auditor copy block (starts around line 75). After the existing `CONTRIBUTING.md` copy (line 87), add:

```powershell
    Copy-To (Join-Path $root "VERSION")                           (Join-Path $a "VERSION")
```

The auditor does **not** get the `migrations/` directory — it doesn't read migrations.

- [ ] **Step 4: Run the build to verify**

Run:
```bash
cd C:/code/repos/aidos/skills && powershell -ExecutionPolicy Bypass -File build.ps1
```
Expected: "Build complete:" followed by listing of `aidos-builder.zip` and `aidos-auditor.zip`.

- [ ] **Step 5: Verify VERSION is inside both ZIPs**

Run:
```bash
cd C:/code/repos/aidos/skills/dist && \
  unzip -l aidos-builder.zip | grep -E "VERSION|migrations" && \
  echo "---auditor---" && \
  unzip -l aidos-auditor.zip | grep -E "VERSION|migrations"
```
Expected:
- Builder ZIP contains `aidos-builder/VERSION` and `aidos-builder/migrations/README.md`.
- Auditor ZIP contains `aidos-auditor/VERSION`. No `migrations/` entry.

If `unzip` isn't available, use PowerShell:
```bash
powershell -Command "[System.IO.Compression.ZipFile]::OpenRead('C:\code\repos\aidos\skills\dist\aidos-builder.zip').Entries | Select-Object FullName | Where-Object { $_.FullName -match 'VERSION|migrations' }"
```

- [ ] **Step 6: Commit**

```bash
git add skills/build.ps1
git commit -m "build(versioning): bundle VERSION and migrations/ into skill ZIPs"
```

---

## Task 14: Add developer migration guardrail to CLAUDE.md

**Files:**
- Modify: `CLAUDE.md` — append a new `## Migrations` section at the end of the file

- [ ] **Step 1: Append the new section**

Open `C:\code\repos\aidos\CLAUDE.md`. Append (as a new top-level section at the very end of the file):

```markdown
## Migrations

When modifying templates, rubrics, naming conventions, or artifact structure in `src/prompts/`, `src/templates/`, `src/rubrics/`, or `skills/`:

1. Determine if the change affects the structure or naming of generated artifacts, or the metadata block. If yes, this is a **minor** version bump.
2. Increment the middle segment in the repo-root `VERSION` file (e.g. `1.0.0` → `1.1.0`).
3. Create a migration file at `src/migrations/vX.Y.Z-to-vX.Y+1.0.md` following the format in `src/migrations/README.md`. Write the instructions so an AI agent can apply them to a single artifact file at a time.
4. Update the placeholder `**AIDOS Version:** X.Y.Z` in any affected template so new scaffolds start at the new version.
5. If the change is wording-only with no structural impact (rubric clarifications, prompt tweaks), it's a **patch** bump — increment the last segment of `VERSION`. No migration file needed.

Major version bumps (e.g. `1.x.x` → `2.0.0`) are reserved for fundamental redesigns where automated migration may not be feasible. If you think you're looking at a major bump, stop and discuss it before proceeding — major bumps are not in scope for the current framework generation.

After a version bump, tag the repo: `git tag vX.Y.Z`.
```

- [ ] **Step 2: Verify**

Run:
```bash
grep -n "^## Migrations" C:/code/repos/aidos/CLAUDE.md
```
Expected: one match, near the end of the file.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(versioning): add developer migration guardrail to CLAUDE.md"
```

---

## Task 15: Update Confluence connector README with tag pinning and org-restricted guidance

**Files:**
- Modify: `src/connectors/confluence/README.md` — update workflow snippet to pin a tag; add an "Org-restricted environments" subsection

- [ ] **Step 1: Change the workflow snippet to use a tag**

Open `C:\code\repos\aidos\src\connectors\confluence\README.md`. Find the workflow YAML on line 35 that currently reads:

```yaml
    uses: shobman/aidos/.github/workflows/confluence-publish.yml@main
```

Change it to:

```yaml
    uses: shobman/aidos/.github/workflows/confluence-publish.yml@v1.0.0
```

Immediately after the code block (after line 44, which says "PRs dry-run..."), insert a short note:

```markdown
> **Pin a tag, not `@main` or `@sha`.** AIDOS releases are tagged using semver (`vX.Y.Z`). Pinning to a tag means your workflow stays on a known-good version and only moves when you bump the pin. The tag to use is the current AIDOS framework version — see the `VERSION` file at the root of the AIDOS repo.
```

- [ ] **Step 2: Add an Org-Restricted Environments section**

Scroll to find a good insertion point — after the main Install steps but before any "Troubleshooting" or later sections. If there's no obvious place, add it as a new top-level `##` section right before the last section in the file.

Run to find section boundaries:
```bash
grep -n "^## " C:/code/repos/aidos/src/connectors/confluence/README.md
```

Insert this section. The exact content to paste is everything between the `====` markers below (do not include the `====` markers):

====
## Org-Restricted Environments

Some organisations block all public GitHub Actions by policy. If your org's workflow policy rejects `uses: shobman/aidos/...@v1.0.0`, you have two options:

### Option 1 — Vendor the workflow

Fork the AIDOS repo into your org, or copy `.github/workflows/confluence-publish.yml` and `src/connectors/confluence/` into an internal repo. Reference it by internal path instead:

```yaml
    uses: your-org/internal-aidos/.github/workflows/confluence-publish.yml@v1.0.0
```

Tag your internal fork with the same version as the upstream AIDOS release it's based on. When upstream cuts a new release, pull the changes in and re-tag.

### Option 2 — Inline the workflow

If forking isn't practical, write a workflow in your consuming repo that runs the publish script directly. You'll need to vendor `src/connectors/confluence/publish.js` (and its dependencies) into your repo as well. Track which upstream version you're based on in the workflow file's comments — the AIDOS version in your artifact files tells you which release's publish script to align with.

### Tracking alignment

In either option, the `**AIDOS Version:**` field in your artifact files is the source of truth for "what AIDOS version should this workflow be running". If artifacts are on v1.1.0, the workflow should be on the v1.1.0 release (or later-compatible). Keep the workflow's internal version pin in step with what your artifacts declare.
====

- [ ] **Step 3: Verify**

Run:
```bash
grep -n "@v1.0.0\|Org-Restricted Environments\|Pin a tag" C:/code/repos/aidos/src/connectors/confluence/README.md
```
Expected: three matches — the pinned `@v1.0.0` in the example, the new section header, and the "Pin a tag" note.

- [ ] **Step 4: Commit**

```bash
git add src/connectors/confluence/README.md
git commit -m "docs(versioning): pin Confluence workflow to tag and document org-restricted environments"
```

---

## Task 16: Rebuild skills and do a manual behaviour smoke test

**Files:** None modified. Manual verification step.

This task is unavoidable: the skills are LLM prompts. Mechanical grep cannot verify "does Claude follow the versioning rules in a session". This is the smoke test.

- [ ] **Step 1: Rebuild the skill ZIPs**

Run:
```bash
cd C:/code/repos/aidos/skills && powershell -ExecutionPolicy Bypass -File build.ps1
```
Expected: both ZIPs build successfully.

- [ ] **Step 2: Sanity-check the bundle contents**

Run:
```bash
cd C:/code/repos/aidos/skills/dist && \
  unzip -p aidos-builder.zip aidos-builder/VERSION && \
  echo "---" && \
  unzip -p aidos-builder.zip aidos-builder/migrations/README.md | head -5
```
Expected:
- `VERSION` output: `1.0.0`
- `migrations/README.md` output: starts with `# AIDOS Migrations`

- [ ] **Step 3: Manual test — scaffold a new artifact in Claude Code**

In a separate Claude Code session (or a claude.ai session with the builder skill installed), run:

> "I want to build a Problem artifact for a small test project: 'Team has no way to track their weekly retrospective actions.'"

Expected behaviour:
- The builder scaffolds `problem.md` with `**AIDOS Version:** 1.0.0` in the metadata block.
- If the current `VERSION` file says anything other than `1.0.0`, the scaffold should use that value instead.

If the builder doesn't stamp the version, go back to Task 9 and tighten the "Stamping new artifacts" sub-section.

- [ ] **Step 4: Manual test — open an older file**

Create a test `problem.md` somewhere with `**AIDOS Version:** 0.9.0` in the metadata (deliberately behind), then ask the builder skill to review/edit it.

Expected: the builder warns that the file is behind and offers an upgrade. Since no `v0.9.0-to-v1.0.0.md` migration file exists, the offer should degrade gracefully — either the builder says "no migration file exists for this path, update manually" or the upgrade offer is absent for an unknown version. Either is acceptable; the prompt doesn't need to handle pre-1.0.0 files as a first-class case.

If the builder proceeds silently without warning, Task 9 needs tightening.

- [ ] **Step 5: Manual test — auditor on an older file**

Run the auditor on the same test file from Step 4.

Expected: the auditor warns that the file is behind the current rubric before delivering findings.

If the auditor proceeds silently, Task 10 needs tightening.

- [ ] **Step 6: Document observations**

No commit for this task unless a prompt fix was needed. If you did need to adjust Task 9 or 10, commit the fix with message `fix(versioning): <what was fixed based on smoke test>`.

---

## Task 17: Tag v1.0.0

**Files:** None modified. Release tagging.

- [ ] **Step 1: Verify working tree is clean and on main branch**

Run:
```bash
git status
git branch --show-current
```
Expected: working tree clean, on the working branch for this plan. Do not tag while uncommitted changes exist.

If not on `main`, this tag should be created after the feature branch is merged into main — not on the feature branch. Pause here and confirm with the user whether to merge first or tag the current branch.

- [ ] **Step 2: Create the annotated tag**

Once on main with all versioning work merged:

```bash
git tag -a v1.0.0 -m "AIDOS v1.0.0 — initial versioned release. Introduces per-file AIDOS Version metadata, migration framework, and skill-level version checks."
```

- [ ] **Step 3: Verify the tag**

Run:
```bash
git tag -l | grep v1.0.0 && git show v1.0.0 --stat --no-patch | head -20
```
Expected: `v1.0.0` appears in the tag list; `git show` displays the tag message.

- [ ] **Step 4: (Optional) Push the tag**

Ask the user before pushing. Pushing a tag is visible to others — confirm first.

```bash
# Only if user approves:
git push origin v1.0.0
```

---

## Summary

**Files created:** `VERSION`, `src/migrations/README.md`, `src/migrations/.gitkeep`.

**Files modified:** 5 templates, 2 prompts, 2 SKILL.md files, 1 build script, `CLAUDE.md`, Confluence README.

**Behavioural outcomes:**
- New artifacts scaffold with `**AIDOS Version: 1.0.0**` metadata.
- Builder detects version gaps per-file, offers in-session upgrade against migration files.
- Auditor warns on version mismatch but never executes migrations.
- Developers are prompted by `CLAUDE.md` to create migration files on structural changes.
- Confluence workflow pins to tag, with documented escape hatch for org-restricted environments.
- Repo is tagged `v1.0.0` as the baseline release.
