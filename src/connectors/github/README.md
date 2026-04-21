# AIDOS GitHub MCP Connector

A local MCP server that gives AI agents (Claude Desktop, Copilot) read/write access to `.aidos/` folders in GitHub repos.

Lets non-technical users author AIDOS artifacts via AI without ever touching Git. The server runs as a subprocess of your MCP client and exposes 7 tools that the AI uses to resolve repos, read artifacts, save changes, surgically edit files, review diffs, publish PRs, and resolve merge conflicts.

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
3. The 7 AIDOS tools should be available: `open_workspace`, `read_artifacts`, `save`, `edit`, `diff`, `publish`, `resolve`
4. Ask Claude: *"Open the AIDOS workspace for `<your-org>/<your-repo>`"*
5. The first call triggers GitHub device flow:
   - Claude shows: *"Go to https://github.com/login/device and enter code XXXX-XXXX"*
   - Open the URL, enter the code, authorise the OAuth App
   - Token is cached at `~/.aidos/auth.json` for future sessions

The auth flow is two-phase: the first call initiates device flow and returns the code; after you authorise in the browser, ask the AI to open the workspace again and it will pick up the token. Subsequent sessions skip auth entirely and go straight to work. Tokens are auto-refreshed if revoked.

## Use

### Tools

| Tool | Purpose |
|------|---------|
| `open_workspace` | Resolve repo (fuzzy match supported), create/sync working branch, discover `.aidos/` folders, validate manifest, surface work-in-progress and last publish status |
| `read_artifacts` | Batch read all files from a `.aidos/` folder |
| `save` | Preview files to commit (default) or commit them (`confirm=true`) |
| `edit` | Surgical edits to existing files using `old_string`/`new_string` — faster than `save` and preserves untouched content |
| `diff` | Show changes vs target branch |
| `publish` | Run pre-flight checks (branch exists, conflicts, reviewers) and preview; execute on `confirm=true`. Supports three strategies: `pr`, `push`, `staged` |
| `resolve` | Apply conflict resolutions returned by `publish` — commits the merge and opens the PR in one call |

`save` and `publish` are two-phase: the first call returns a preview, the second call with `confirm=true` performs the action. `edit` is one-phase — the `old_string` field is the verification that the agent knows what it's changing, so no preview round-trip is needed.

### Workflow

```
open_workspace("my-repo") → creates aidos/{you} branch, finds .aidos/ folders,
                            validates manifest, reports WIP if any
read_artifacts(...)       → loads all artifacts into AI context
[work with AI]
edit(edits)               → surgical change to existing files (preferred for edits)
save(files, message)      → preview of full-file write (for new files)
save(..., confirm=true)   → atomic commit to working branch
diff()                    → review changes vs target branch
publish()                 → runs pre-flight, opens PR on clean sync,
                            returns conflict packet if main diverged
resolve(merges)           → echoes the packet back with user's resolutions,
                            commits the merge, opens the PR
--- strategy: "staged" (alternate publish ending) ---
publish()                 → merges working branch → staging_branch (e.g. aidos),
                            deletes working branch. Shipped workflow maintains
                            a rolling PR staging_branch → target.
```

### Example session

A typical non-coder session looks like this. Your AI assistant handles the tool calls; you only write what's in bold.

> **You:** Open the AIDOS workspace for portfolio-analytics.
>
> *Claude:* Found your workspace at `fefundinfo-zenith/Zenith.Core` on branch `aidos/you`. One artifact folder: `docs/projects/portfolio-analytics/.aidos/`. Manifest is configured to open PRs against `main` with reviewers `@product-team`. What do you want to work on?
>
> **You:** Update F1 with the new validation approach we agreed last week.
>
> *Claude:* [reads the artifacts]. Here's F1 currently — [summarises]. Based on our conversation, I'd change the validation section to say … Does that look right?
>
> **You:** Yes, that's good.
>
> *Claude:* Ready to commit `f1.md` with the updated validation section. Message: *"F1: update validation approach"*. OK to save?
>
> **You:** Go ahead.
>
> *Claude:* Saved. Anything else, or ready to publish?
>
> **You:** Publish.
>
> *Claude:* Pre-flight clean: branch is up to date with `main`, reviewers resolved. Call publish with confirm=true to proceed?
>
> **You:** Yes.
>
> *Claude:* Opened PR #42 — [link]. Merging will also trigger the Confluence publish workflow per your manifest. Done.

That's the happy path. Two-phase prompts (`save` and `publish` both preview before acting) give you a chance to check what's about to happen before anything lands in the repo.

For most revisions the AI will use `edit` under the hood — a surgical change that only sends the exact old/new text through, rather than regenerating the whole file. You'll notice this is fast (seconds) compared to `save`, which rewrites the full file and can take minutes for a large artifact. The AI picks the right tool; you don't need to think about which.

When `main` has diverged and your changes clash with someone else's, `publish` returns a conflict packet instead — see the next section.

### Handling conflicts

When `main` has advanced since you last synced and your changes overlap with someone else's, `publish` can't auto-merge. Instead it returns a **conflict packet** — for each conflicting file, you'll see the common ancestor content, what's on main now, and what's on your branch.

Your AI assistant will walk through each conflict with you and propose a merged version. When you're happy, the assistant calls `resolve` with your choices. The connector:
1. Verifies the main content hasn't drifted since the packet was generated (if it has, you'll see a fresh conflict for that file).
2. Commits a proper merge commit with both branches as parents.
3. Opens the PR.

If someone else pushed between your resolution and the `resolve` call, you'll just cycle through the flow one more time — the connector never silently drops anyone's changes.

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
| `strategy` | `"pr"` | `"pr"` for pull request, `"push"` for direct merge, `"staged"` for merge to a persistent staging branch with a rolling PR to `target` |
| `target` | repo default | Final target branch. For `pr`/`push`: branch to PR/merge into. For `staged`: base of the rolling PR from the staging branch |
| `staging_branch` | `"aidos"` | *(staged only)* Persistent branch between working branches and `target`. The rolling PR is opened from this branch to `target` by the shipped workflow |
| `reviewers` | `[]` | GitHub users (`alice`) or teams (`@org/team-name`) for PR review. *(staged mode: the shipped workflow does not request reviewers — use CODEOWNERS or branch-protection required reviewers instead.)* |

### Choosing a strategy

`pr` and `staged` both keep branch protection on `target` intact. The difference is where artifacts *land immediately*:

- **`pr`** — working branch → PR to `target`. Non-coder publishes wait on dev review before artifacts land anywhere. Fine when `.aidos/` changes need the same review rigour as code changes.
- **`push`** — working branch → direct merge into `target`. No protection on `target`. Only appropriate for solo repos or trusted-author contexts.
- **`staged`** — working branch → immediate merge into `staging_branch`; a rolling PR from `staging_branch` to `target` accumulates changes for dev review. Non-coders publish immediately; engineering commits by merging the rolling PR when they're ready to pick the work up.

Use `staged` when you want non-coders to socialise and publish artifacts (including to Confluence) without waiting on engineering commitment. The `target` branch stays protected; engineering controls when they merge the rolling PR.

### Branch model

Each user gets one `aidos/{github-username}` branch per repo. The branch is created from the repo's default branch and the connector only touches `.aidos/` paths, ensuring clean merges with the rest of the codebase. After PR merge or push-merge, the branch is deleted. The next session creates a fresh one.

**Recommended:** enable *"Automatically delete head branches"* in the target repo's GitHub settings so `aidos/*` branches are cleaned up automatically after a PR merge.

### Staging branch model (strategy: `staged`)

Under `staged`, the `staging_branch` (default `aidos`) is a persistent branch that sits slightly ahead of `target`. It's the socialisation surface: non-coders publish here, Confluence publishing fires from here, stakeholders read here.

Merging the rolling PR `staging_branch → target` is the **engineering commitment signal**: "we're picking this up to build it." Until that merge happens, docs evolve freely on `staging_branch` without disturbing `target`.

Requires the `aidos-staging.yml` workflow installed in `.github/workflows/` to maintain the rolling PR and reset `staging_branch` after each merge. If the workflow isn't installed, publishes still succeed to `staging_branch`, but no rolling PR is opened — the workspace dashboard warns when this is the case.

**Install the workflow:** copy `src/connectors/github/workflows/aidos-staging.yml` into `.github/workflows/` in the target repo. If you changed `staging_branch` or `target` from the defaults (`aidos` / `main`), edit the `env:` block at the top of the copied file to match.

**Confluence under staged.** If you're using the Confluence publish connector, retarget its trigger branch in `.github/workflows/<confluence-workflow>.yml` from your `target` branch to your `staging_branch`. That way Confluence publishes fire when non-coders push to the staging branch — which is exactly the point: publish-for-socialisation happens without waiting for engineering commitment.

### Publish side-effect

If the repo's `.aidos/manifest.json` has a `publish.*` section (e.g. `publish.confluence`), a merge of the working branch into the target branch will trigger a publish via GitHub Actions. The builder skill warns about this before publish — you'll know before any side-effects happen.

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

145 tests across 30 suites. All tests are unit tests with mocked `fetch` — no GitHub API calls, no network, no auth required. Runs in under a second.

### Project structure

```
src/connectors/github/
├── server.js                   ← MCP server entry + tool registrations + orchestration
├── github.js                   ← GitHub REST API client (fetch-based)
├── auth.js                     ← Two-phase device flow + token cache
├── errors.js                   ← User-facing error mapper
├── edit.js                     ← Surgical string-replacement logic for the edit tool
├── manifest.js                 ← Manifest schema validation (ajv)
├── manifest.schema.json        ← JSON Schema for .aidos/manifest.json
├── merge.js                    ← Conflict detection, packet building, Flavor B 3-way merge orchestration
├── package.json                ← Node package (ESM, @modelcontextprotocol/sdk, zod, ajv)
├── README.md                   ← This file
├── workflows/
│   └── aidos-staging.yml       ← GitHub Actions workflow for strategy: staged
└── test/
    ├── auth.test.js            ← Token cache tests
    ├── auth-flow.test.js       ← Two-phase device flow tests
    ├── edit.test.js            ← Edit logic unit tests
    ├── errors.test.js          ← Error mapper tests
    ├── github.test.js          ← API client unit tests
    ├── integration.test.js     ← End-to-end publish→conflict→resolve loop tests
    ├── manifest.test.js        ← Manifest validation tests
    ├── merge.test.js           ← Merge logic unit tests
    ├── preflight.test.js       ← Publish pre-flight tests
    ├── rendering.test.js       ← Workspace dashboard rendering tests
    ├── resolve-repo.test.js    ← Fuzzy repo resolution tests
    └── tools.test.js           ← Tool logic tests with mocked client
```

Each logic function is exported from `server.js` and unit-tested in isolation (see `resolveWorkspace`, `readArtifacts`, `saveArtifacts`, `diffBranch`, `publishChanges`). The MCP tool registrations wrap these functions thinly — test the logic, not the MCP protocol.

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

The connector translates GitHub errors into actionable guidance — most common issues surface as readable text in the AI chat. If you see one of the messages below, here's what to do.

**"The AIDOS GitHub connector needs a GitHub OAuth App Client ID..."**
The `AIDOS_GITHUB_CLIENT_ID` env var isn't reaching the server. Check that the `env` block is inside the `aidos-github` server entry in `claude_desktop_config.json`, then fully quit and restart Claude Desktop (not just close the window). The message includes step-by-step setup instructions.

**"The GitHub OAuth App Client ID appears to be invalid (GitHub returned 404)..."**
Either the Client ID is wrong, Device Flow is not enabled on the OAuth App, or the app has been deleted. Go to the OAuth App settings page, verify the Client ID matches your Claude Desktop config, and tick the "Enable Device Flow" checkbox.

**"Authentication required. Go to https://github.com/login/device..."**
First-time auth — open the URL in a browser, enter the code, authorise the OAuth App. Then ask the AI to open the workspace again; it will pick up the token. No need to restart the server.

**"Still waiting for authorisation..."**
You asked the AI to open the workspace again before completing the browser authorisation. Finish the authorisation in the browser, then ask the AI to retry.

**Tools don't appear in Claude Desktop**
Check the Claude Desktop logs (Settings → Developer → Open Logs Folder) for `aidos-github` errors. Common causes: wrong path to `server.js`, `npm install` not run, invalid JSON in `claude_desktop_config.json`.

**"Publish returned a conflict packet"**
Main has changes that overlap with yours. The AI will walk through each conflict and propose a resolution — confirm or adjust each one, and the `resolve` tool commits the merge and opens the PR. No terminal or manual `git merge` required.

**Re-authenticate**
Normally not needed — a revoked or expired token triggers a fresh device flow automatically on the next call. If you want to force it, delete `~/.aidos/auth.json` and `~/.aidos/pending_auth.json`.
