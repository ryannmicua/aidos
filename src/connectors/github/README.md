# AIDOS GitHub MCP Connector

A local MCP server that gives AI agents (Claude Desktop, Copilot) read/write access to `.aidos/` folders in GitHub repos.

Lets non-technical users author AIDOS artifacts via AI without ever touching Git. The server runs as a subprocess of your MCP client and exposes 5 tools that the AI uses to resolve repos, read artifacts, save changes, review diffs, and submit PRs.

---

## Prerequisites

- **Node.js 20+** — `node --version` to check
- **GitHub account** with access to the repos you'll work on
- **Claude Desktop** (or another MCP-compatible client)
- A **GitHub OAuth App** with Device Flow enabled (see Install Step 1)
- A local clone of the `aidos` repo

## Install

### Step 1 — Register a GitHub OAuth App (Device Flow)

You need a GitHub OAuth App with **Device Flow** enabled. This is a one-time setup. The OAuth App can be registered under your personal account or your organisation.

1. Go to **GitHub → Settings → Developer Settings → OAuth Apps → New OAuth App**
   (or for an org: **Org Settings → Developer Settings → OAuth Apps**)
2. Fill in the form:
   - **Application name:** `AIDOS GitHub MCP` (anything descriptive)
   - **Homepage URL:** `https://github.com/<your-org>/aidos` (or any URL)
   - **Authorization callback URL:** `https://localhost` (not used by device flow, but required by the form)
3. Click **Register application**
4. On the app page, **tick the "Enable Device Flow" checkbox** and save
5. Copy the **Client ID** (looks like `Iv23li...`). You do **not** need to generate a client secret — device flow doesn't use one.

Required scopes (granted at first auth, no setup needed): `repo`, `read:org`.

### Step 2 — Install the connector

```bash
cd <your-aidos-clone>/src/connectors/github
npm install
```

### Step 3 — Configure Claude Desktop

Find your `claude_desktop_config.json`:

| OS      | Path                                                                |
|---------|---------------------------------------------------------------------|
| Windows | `%APPDATA%\Claude\claude_desktop_config.json`                       |
| macOS   | `~/Library/Application Support/Claude/claude_desktop_config.json`   |
| Linux   | `~/.config/Claude/claude_desktop_config.json`                       |

Add the `aidos-github` server entry. Use the **absolute path** to `server.js` and your **Client ID** from Step 1:

**Windows example:**
```json
{
  "mcpServers": {
    "aidos-github": {
      "command": "node",
      "args": ["C:\\code\\repos\\aidos\\src\\connectors\\github\\server.js"],
      "env": {
        "AIDOS_GITHUB_CLIENT_ID": "Iv23li...your-client-id..."
      }
    }
  }
}
```

**macOS / Linux example:**
```json
{
  "mcpServers": {
    "aidos-github": {
      "command": "node",
      "args": ["/Users/you/code/aidos/src/connectors/github/server.js"],
      "env": {
        "AIDOS_GITHUB_CLIENT_ID": "Iv23li...your-client-id..."
      }
    }
  }
}
```

If the file already has other MCP servers, add `aidos-github` alongside them inside the existing `mcpServers` object.

### Step 4 — Restart Claude Desktop and verify

1. Quit Claude Desktop completely and reopen it
2. Start a new chat
3. The 5 AIDOS tools should be available: `open_workspace`, `read_artifacts`, `save`, `diff`, `submit`
4. Ask Claude: *"Open the AIDOS workspace for `<your-org>/<your-repo>`"*
5. The first call triggers GitHub device flow:
   - Claude shows: *"Go to https://github.com/login/device and enter code XXXX-XXXX"*
   - Open the URL, enter the code, authorise the OAuth App
   - Token is cached at `~/.aidos/auth.json` for future sessions

Subsequent sessions skip auth and go straight to work.

## Use

### Tools

| Tool | Purpose |
|------|---------|
| `open_workspace` | Resolve repo, create/sync working branch, discover `.aidos/` folders |
| `read_artifacts` | Batch read all files from a `.aidos/` folder |
| `save` | Commit changed files to the working branch |
| `diff` | Show changes vs target branch |
| `submit` | Create PR or merge, per manifest config |

### Workflow

```
open_workspace("my-repo") → creates aidos/{you} branch, finds .aidos/ folders
read_artifacts(...)       → loads all artifacts into AI context
[work with AI]
save(files, message)      → checkpoint commit to working branch
diff()                    → review changes before submitting
submit()                  → PR or merge per manifest.json write config
```

### Manifest configuration

Each `.aidos/` folder in a repo needs a `manifest.json`. Add a `write` section to control how the connector integrates changes:

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
| `reviewers` | `[]` | GitHub users (`alice`) or teams (`@org/team-name`) for PR review |

### Branch model

Each user gets one `aidos/{github-username}` branch per repo. The branch is created from the repo's default branch and the connector only touches `.aidos/` paths, ensuring clean merges with the rest of the codebase. After PR merge or push-merge, the branch is deleted. The next session creates a fresh one.

**Recommended:** enable *"Automatically delete head branches"* in the target repo's GitHub settings so `aidos/*` branches are cleaned up automatically after a PR merge.

### Publish side-effect

If the repo's `.aidos/manifest.json` has a `publish.*` section (e.g. `publish.confluence`), a merge of the working branch into the target branch will trigger a publish via GitHub Actions. The builder skill warns about this before submit — you'll know before any side-effects happen.

## Develop

### Get the code

```bash
git clone https://github.com/shobman/aidos.git
cd aidos/src/connectors/github
npm install
```

### Run the test suite

```bash
npm test
```

22 tests across 8 suites. All tests are unit tests with mocked `fetch` — no GitHub API calls, no network, no auth required. Runs in under a second.

### Project structure

```
src/connectors/github/
├── server.js              ← MCP server entry + tool registrations
├── github.js              ← GitHub REST API client (fetch-based)
├── auth.js                ← Device flow + token cache
├── manifest.schema.json   ← JSON Schema for .aidos/manifest.json
├── package.json           ← Node package (ESM, @modelcontextprotocol/sdk, zod)
├── README.md              ← This file
└── test/
    ├── auth.test.js       ← Token caching + device flow tests
    ├── github.test.js     ← API client unit tests
    └── tools.test.js      ← Tool logic tests with mocked client
```

Each logic function is exported from `server.js` and unit-tested in isolation (see `resolveWorkspace`, `readArtifacts`, `saveArtifacts`, `diffBranch`, `submitChanges`). The MCP tool registrations wrap these functions thinly — test the logic, not the MCP protocol.

### Run the server manually

Useful for debugging MCP traffic or testing tool registration without Claude Desktop:

```bash
# Start server and send an initialize + tools/list request
AIDOS_GITHUB_CLIENT_ID=Iv23li_your_client_id \
  printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"0.1"}}}\n{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' | \
  node server.js
```

Tool responses appear on stdout as JSON-RPC. All logging goes to stderr so it doesn't pollute the protocol stream.

### Extending with a new tool

1. Write the logic as an exported function in `server.js` following the same pattern as the existing ones (takes `client` as first arg, returns plain data)
2. Register it with `server.registerTool(...)` using a zod input schema
3. Add unit tests in `test/tools.test.js` using `mockClient()`
4. Run `npm test` to verify

## Troubleshooting

**"AIDOS_GITHUB_CLIENT_ID environment variable is required"**
The env var isn't reaching the server. Check that the `env` block is inside the `aidos-github` server entry in `claude_desktop_config.json`, then fully quit and restart Claude Desktop (not just close the window).

**"Device flow initiation failed: 404"**
Your OAuth App doesn't have Device Flow enabled. Go back to the OAuth App settings page and tick the "Enable Device Flow" checkbox.

**Tools don't appear in Claude Desktop**
Check the Claude Desktop logs (Settings → Developer → Open Logs Folder) for `aidos-github` errors. Common causes: wrong path to `server.js`, `npm install` not run, invalid JSON in `claude_desktop_config.json`.

**"Branch has diverged from main"**
Someone changed `.aidos/` files on the target branch while your `aidos/{you}` branch had unmerged work. A developer needs to resolve this manually with `git checkout aidos/{you} && git merge main`.

**Re-authenticate**
Delete `~/.aidos/auth.json` to force a fresh device flow on the next call.
