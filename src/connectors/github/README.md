# AIDOS GitHub MCP Connector

An MCP server that gives AI agents (Claude AI, Copilot) read/write access
to `.aidos/` folders in GitHub repos. Lets non-technical users author AIDOS
artifacts without Git CLI.

## Setup

Add to your MCP client config (e.g. Claude Desktop `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "aidos-github": {
      "command": "node",
      "args": ["/path/to/src/connectors/github/server.js"]
    }
  }
}
```

On first use, the server triggers GitHub device flow authentication.
Follow the URL and enter the code shown. Token is cached in `~/.aidos/auth.json`.

## Tools

| Tool | Purpose |
|------|---------|
| `open_workspace` | Resolve repo, create/sync working branch, discover `.aidos/` folders |
| `read_artifacts` | Batch read all files from a `.aidos/` folder |
| `save` | Commit changed files to the working branch |
| `diff` | Show changes vs target branch |
| `submit` | Create PR or merge, per manifest config |

## Workflow

```
open_workspace("my-repo") → creates aidos/{you} branch, finds .aidos/ folders
read_artifacts(...)       → loads all artifacts into AI context
[work with AI]
save(files, message)      → checkpoint commit to working branch
diff()                    → review changes before submitting
submit()                  → PR or merge per manifest.json write config
```

## Manifest Configuration

Add a `write` section to `.aidos/manifest.json`:

```json
{
  "write": {
    "strategy": "pr",
    "target": "main",
    "reviewers": ["@product-team"]
  }
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `strategy` | `"pr"` | `"pr"` for pull request, `"push"` for direct merge |
| `target` | repo default | Branch to PR against or merge into |
| `reviewers` | `[]` | GitHub users/teams for PR review |

## Branch Model

Each user gets one `aidos/{username}` branch per repo. The branch is
created from the repo's default branch and the connector only touches
`.aidos/` paths, ensuring clean merges. After PR merge or push, the
branch is deleted. Next session creates a fresh one.

Note: enable "Automatically delete head branches" in GitHub repo settings
so `aidos/` branches are cleaned up after PR merge.

## Requirements

- Node.js 20+
- GitHub account with repo access
