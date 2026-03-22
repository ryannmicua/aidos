# Claude Setup for AIDOS

AIDOS skills and prompts are agent-agnostic. This file covers Claude-specific
setup: connecting GitHub so Claude can read and write AIDOS artifacts directly,
and how to invoke the builder and auditor skills.

## Connecting GitHub

AIDOS uses GitHub as its artifact store. To enable read/write access from
claude.ai:

**Step 1 — Create a GitHub OAuth App**

- GitHub → Settings → Developer Settings → OAuth Apps → New OAuth App
- **Application name:** `Claude GitHub MCP` — users will see this name
  when authorising. It describes what it is: Claude connecting to GitHub.
- **Homepage URL:** your AIDOS repo e.g. `https://github.com/yourname/aidos`
- **Authorization callback URL:** `https://claude.ai/api/mcp/auth_callback`
- Do not enable Device Flow
- Register the app, then click **Generate a new client secret** — copy it
  immediately, you only see it once

**Step 2 — Add a custom connector in claude.ai**

- Settings → Connectors → Add custom connector
- **Name:** `GitHub MCP`
- **URL:** `https://api.githubcopilot.com/mcp`
- Advanced settings → paste your OAuth Client ID and Client Secret
- Hit Add — complete the GitHub OAuth consent screen when it appears

**Step 3 — Restrict tools to the minimal set**

When prompted to configure tool permissions, enable only:

Read:
- Get file or directory contents
- List branches
- List commits
- List pull requests
- Get details for a single pull request
- Search code
- Search repositories

Write:
- Create branch
- Create or update file
- Open new pull request
- Push files to repository
- Delete file

Block everything else.

## Invoking the Skills

Enable the GitHub MCP connector for your session via the tools menu,
then invoke the skill:

   /aidos-builder   — scaffold and iterate on delivery artifacts
   /aidos-auditor   — audit an artifact against the rubrics

The skill loads automatically and will check for existing aidos/ branches
on your repo at the start of each session.
