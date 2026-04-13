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
