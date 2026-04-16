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
