# Claude Setup for AIDOS

AIDOS is agent-agnostic. This file covers Claude-specific setup — the combinations of components that work together with Claude (Claude.ai, Claude Code, Claude Desktop).

## Pick your setup

| You want to... | Set up |
|---|---|
| Use AIDOS as a Claude Skill in Claude.ai or Claude Code | [Skills](skills/README.md) — download the ZIPs, upload or extract |
| Give Claude Desktop read/write access to `.aidos/` folders in GitHub repos | [GitHub MCP Connector](src/connectors/github/README.md) — local MCP server with Device Flow auth |
| Auto-publish artifacts to Confluence on merge | [Confluence Publish Connector](src/connectors/confluence/README.md) — GitHub Actions workflow |
| Use the framework directly without a skill | [Framework](src/README.md) — paste the prompts into any Claude session |

All four are independent. The most common non-coder setup is **Skills + GitHub MCP Connector + Confluence Publish**: author via Claude Desktop, merge opens a PR, merge publishes to Confluence.

## Skill invocation

After installing the Skills (see [`skills/README.md`](skills/README.md)):

```
/aidos-builder   — scaffold and iterate on delivery artifacts
/aidos-auditor   — audit an artifact against the rubrics
```

The skill loads automatically. If the GitHub MCP Connector is configured, the skill uses its tools to manage the repo. If Claude has direct filesystem access (Claude Code), the skill reads and writes files directly. You don't pick — the skill detects the environment.

## Project-level hints

When using AIDOS in Claude Code, drop a short instruction in the project's own `CLAUDE.md` so Claude automatically invokes the right skill for AIDOS work:

```markdown
For any Problem, Solution, Tech Design, or Testing artifact work, use the
/aidos-builder skill. For reviewing artifacts, use /aidos-auditor in a
separate session.
```

The `.aidos/manifest.json` in your project configures both the GitHub MCP Connector's `write` strategy and the Confluence publish target (if used). See each connector's README for the manifest fields.

## Migrations

When modifying templates, rubrics, naming conventions, or artifact structure in `src/prompts/`, `src/templates/`, `src/rubrics/`, or `skills/`:

1. Determine if the change affects the structure or naming of generated artifacts, or the metadata block. If yes, this is a **minor** version bump.
2. Increment the middle segment in the repo-root `VERSION` file (e.g. `1.0.0` → `1.1.0`).
3. Create a migration file at `src/migrations/vX.Y.Z-to-vX.Y+1.0.md` following the format in `src/migrations/README.md`. Write the instructions so an AI agent can apply them to a single artifact file at a time.
4. Update the placeholder `**AIDOS Version:** X.Y.Z` in any affected template so new scaffolds start at the new version.
5. If the change is wording-only with no structural impact (rubric clarifications, prompt tweaks), it's a **patch** bump — increment the last segment of `VERSION`. No migration file needed.

Major version bumps (e.g. `1.x.x` → `2.0.0`) are reserved for fundamental redesigns where automated migration may not be feasible. If you think you're looking at a major bump, stop and discuss it before proceeding — major bumps are not in scope for the current framework generation.

After a version bump, tag the repo: `git tag vX.Y.Z`.
