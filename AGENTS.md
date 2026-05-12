# Codex Setup for AIDOS

AIDOS is agent-agnostic. This file covers Codex-specific setup — the combinations of components that work together with Codex (Codex.ai, Codex, Codex Desktop).

## Pick your setup

| You want to... | Set up |
|---|---|
| Use AIDOS as a Codex Skill in Codex.ai or Codex | [Skills](skills/README.md) — download the ZIPs, upload or extract |
| Give Codex Desktop read/write access to `.aidos/` folders in GitHub repos | [GitHub MCP Connector](src/connectors/github/README.md) — local MCP server with Device Flow auth |
| Auto-publish artifacts to Confluence on merge | [Confluence Publish Connector](src/connectors/confluence/README.md) — GitHub Actions workflow |
| Use the framework directly without a skill | [Framework](src/README.md) — paste the prompts into any Codex session |

All four are independent. The most common non-coder setup is **Skills + GitHub MCP Connector + Confluence Publish**: author via Codex Desktop, merge opens a PR, merge publishes to Confluence.

## Skill invocation

After installing the Skills (see [`skills/README.md`](skills/README.md)):

```
/aidos-builder   — scaffold and iterate on delivery artifacts
/aidos-auditor   — audit an artifact against the rubrics
```

The skill loads automatically. If the GitHub MCP Connector is configured, the skill uses its tools to manage the repo. If Codex has direct filesystem access (Codex), the skill reads and writes files directly. You don't pick — the skill detects the environment.

## Project-level hints

When using AIDOS in Codex, drop a short instruction in the project's own `AGENTS.md` so Codex automatically invokes the right skill for AIDOS work:

```markdown
For any Problem, Solution, Tech Design, or Testing artifact work, use the
/aidos-builder skill. For reviewing artifacts, use /aidos-auditor in a
separate session.
```

The `.aidos/manifest.json` in your project configures both the GitHub MCP Connector's `write` strategy and the Confluence publish target (if used). See each connector's README for the manifest fields.

## Development workflow

Multi-step work (new tools, connector changes, framework features) follows a consistent flow. Future sessions should respect this cadence:

1. **Brainstorm → spec → plan.** Use `superpowers:brainstorming` to turn an idea into a design doc at `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`, then `superpowers:writing-plans` for an implementation plan at `docs/superpowers/plans/YYYY-MM-DD-<topic>.md`. Both directories are gitignored — they're local planning artifacts, not shipped.

2. **Worktree for feature work.** Use `superpowers:using-git-worktrees` to set up an isolated worktree on a branch named `feature/<topic>` (e.g. `feature/github-connector-edit-tool`). Worktrees live as siblings to the main clone.

3. **Execute with review checkpoints.** `superpowers:subagent-driven-development` is the preferred executor — fresh implementer subagent per plan task, spec-compliance review first, then code-quality review, fix loops until approved. Final code-reviewer subagent over the whole branch diff before pushing.

4. **Push and open a PR.** `git push -u origin feature/<topic>`, then `gh pr create` with summary + test plan. Do **not** merge yet.

5. **Wait for user approval.** Merging requires an explicit "yes, merge it" from the user. Never merge proactively, even after clean reviews. This is a hard rule — the user is the authoritative gate.

6. **Merge the PR.** Once approved, merge with a merge commit (not squash) so the step-by-step commits remain readable:
   ```bash
   gh pr merge <N> --merge
   ```

7. **Tag the release.** After pulling merged main, create an **annotated** tag on the merge commit:
   ```bash
   git checkout main && git pull --ff-only
   git tag -a vX.Y.Z -m "Short description of the release"
   git push origin vX.Y.Z
   ```
   Always annotated (`-a -m`), never lightweight — we want author, date, and message captured in the tag object.

8. **Clean up in order.**
   ```bash
   # 1. Confirm everything is on main (should print nothing):
   git log main..origin/feature/<topic> --oneline

   # 2. Delete remote feature branch:
   git push origin --delete feature/<topic>

   # 3. Remove worktree:
   git worktree remove ../aidos-<topic>

   # 4. Delete local feature branch (safe -d, not -D):
   git branch -d feature/<topic>
   ```
   If `git branch -d` refuses, something is unmerged — investigate, don't `-D` to force.

## Migrations

When modifying templates, rubrics, naming conventions, or artifact structure in `src/prompts/`, `src/templates/`, `src/rubrics/`, `src/framework.md`, or `skills/`:

1. Determine if the change affects the structure or naming of generated artifacts, or the metadata block. If yes, this is a **minor** version bump.
2. Increment the middle segment in the repo-root `VERSION` file (e.g. `1.0.0` → `1.1.0`).
3. Create a migration file at `src/migrations/vX.Y.Z-to-vX.Y+1.0.md` (e.g. `v1.0.0-to-v1.1.0.md`) following the format in `src/migrations/README.md`. Write the instructions so an AI agent can apply them to a single artifact file at a time.
4. Update the `**AIDOS Version:** X.Y.Z` placeholder in any affected template to keep it in sync with `VERSION`.
5. If the change is wording-only with no structural impact (rubric clarifications, prompt tweaks), it's a **patch** bump — increment the last segment of `VERSION`. No migration file needed.

Major version bumps (e.g. `1.x.x` → `2.0.0`) are reserved for fundamental redesigns where automated migration may not be feasible. If you think you're looking at a major bump, stop and discuss it before proceeding — major bumps are not in scope for the current framework generation.

After a version bump, tag the repo with an annotated tag (see "Development workflow" → step 7).
