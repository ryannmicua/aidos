# AIDOS Confluence Connector

A GitHub Actions workflow that publishes AIDOS artifacts from a `.aidos/` folder to Confluence on every push.

One-way publish. The repository is source of truth; Confluence is a read-only projection. Folders become pages, markdown translates to Confluence storage format with native macros, and unchanged pages are skipped via content hashing.

---

## Prerequisites

- **Confluence Cloud** (not Server/Data Center) — your URL looks like `https://<your-org>.atlassian.net`
- **Node.js 20+** (only if you want to run the script locally for dry-runs)
- A Confluence **API token** — generate at https://id.atlassian.com/manage-profile/security/api-tokens
- A **root page** in your Confluence space — create one manually, copy its page ID from the browser URL. For a page at `https://acme.atlassian.net/wiki/spaces/ENG/pages/123456789/My+Root+Page`, the page ID is `123456789`.
- A **GitHub repo** with a `.aidos/` folder containing artifacts you want to publish

## Install

### Step 1 — Add the publish workflow to your repo

Create `.github/workflows/confluence-publish.yml` in your consuming repo:

```yaml
name: Publish AIDOS to Confluence
on:
  pull_request:
    paths: ['.aidos/**']
  push:
    branches: [main]
    paths: ['.aidos/**']
  workflow_dispatch:

jobs:
  publish:
    uses: shobman/aidos/.github/workflows/confluence-publish.yml@main
    with:
      manifest-path: .aidos/manifest.json
      dry-run: ${{ github.event_name == 'pull_request' }}
    secrets:
      confluence_email: ${{ secrets.CONFLUENCE_EMAIL }}
      confluence_token: ${{ secrets.CONFLUENCE_TOKEN }}
```

PRs dry-run (preview in the Actions log), merges to main publish for real.

If your repo has multiple `.aidos/` folders (e.g. a monorepo), omit `manifest-path` and the workflow will auto-discover all `manifest.json` files.

### Step 2 — Add GitHub Actions secrets

In your consuming repo: **Settings → Secrets and variables → Actions → New repository secret**.

Add both:

- `CONFLUENCE_EMAIL` — the email address associated with your Atlassian account
- `CONFLUENCE_TOKEN` — the API token you generated in Prerequisites

### Step 3 — Add `.aidos/manifest.json` to your repo

Place a `manifest.json` in your `.aidos/` folder:

```json
{
  "publish": {
    "confluence": {
      "baseUrl": "https://example.atlassian.net",
      "rootPageId": "123456789"
    }
  }
}
```

Two required fields. The script discovers artifacts automatically, parses metadata from each file, and derives the Confluence space from the root page.

### Step 4 — Push and verify

Commit the workflow file and manifest, push to main. The Actions tab should show the workflow running. When it completes, your artifacts appear as child pages under the root page in Confluence.

## Use

Once installed, the workflow runs automatically on every push to `.aidos/**`:

- **PRs** run in `--dry-run` mode — full preview in the Actions log, no Confluence changes
- **Merges to main** publish for real

### Git → Confluence mapping

```
.aidos/                          Root Page (Dashboard)
├── problem.md                   ├── Problem
├── solution.md                  ├── Solution
├── tech-design.md               ├── Tech Design
├── testing.md                   ├── Testing
├── issues-log.md                ├── Issues Log
├── feature-auth/                ├── Feature Auth        ← body from feature-auth.md
│   ├── feature-auth.md          │                         + Children macro appended
│   ├── test-plan.md             │   ├── Test Plan
│   ├── story-login.md           │   ├── Story Login
│   └── story-signup.md          │   └── Story Signup
├── feature-payments/            ├── Feature Payments    ← body from feature-payments.md
│   ├── feature-payments.md      │                         + Children macro appended
│   ├── test-plan.md             │   ├── Test Plan
│   └── story-checkout.md        │   └── Story Checkout
└── refs/                        └── Refs               ← auto-generated page
    ├── api-guide.md                 ├── Api Guide         with Children macro
    └── runbook.md                   └── Runbook
```

### Folder conventions

| Scenario | What happens |
|----------|-------------|
| Folder named `epic/`, `feature/`, or `story/` | **Transparent** — no Confluence page created. Contents promoted to the parent level with the scale applied as a label. |
| Folder has a `.md` file with the same name (`feature-auth/feature-auth.md`) | File content becomes the page body. Stories section + Children macro appended. |
| Folder has no matching `.md` file (`refs/`) | Auto-generated page with title + Children macro. All `.md` files inside become child pages. |
| Any depth of nesting | Fully recursive — nest as deep as you need. |

Page titles are derived from filenames: strip `.md`, split on `-`, title-case each word. `tech-design.md` becomes **Tech Design**.

### Markdown → Confluence translation

| Markdown | Confluence | Notes |
|----------|-----------|-------|
| `**Status:** Draft` | Status lozenge in Page Properties table | See colour mapping below |
| `**Owner:** Simon` | Row in Page Properties table | |
| `[Solution](solution.md)` | `ac:link` (page title link) | Cross-artifact links resolve by title. Path prefixes stripped — works across folders. |
| `` ```js ... ``` `` | `ac:structured-macro` code block | Syntax-highlighted with language parameter |
| `> **Note:** text` | Info panel (blue) | |
| `> **Warning:** text` | Warning panel (yellow) | |
| `> **Decision:** text` | Note panel (yellow) | |
| `> **Tip:** text` | Tip panel (green) | |
| `<details><summary>Title</summary>` | Expand/collapse macro | Collapsible sections |
| Tables, lists, headings, bold, italic | Standard HTML equivalents | Passed through cleanly |

**Status lozenge colours:** Not Started → Grey, Draft → Yellow, In Progress → Blue, Review → Purple, Done → Green, Blocked → Red. Unrecognised values default to Grey.

### Labels

Every published page gets labels automatically:

| Label | Source |
|-------|--------|
| Artifact type | Derived from filename: `problem`, `tech-design`, `testing`, etc. |
| Scale | Inferred from directory structure: root files → `epic`, folder pages → `feature`, their children → `story` |
| `aidos` | Always applied — identifies connector-managed pages |

Scale labels power the root dashboard (separate Epics and Features tables) and the Stories section on feature pages. Labels enable Confluence search, CQL filtering, and dashboard reports.

### Title template (optional)

If your Confluence space has existing pages with common names, add a `titleTemplate` to prefix all page titles and avoid collisions:

```json
{
  "publish": {
    "confluence": {
      "baseUrl": "https://example.atlassian.net",
      "rootPageId": "123456789",
      "titleTemplate": "(CW) %title%"
    }
  }
}
```

`%title%` is replaced with the title derived from each filename. Cross-artifact links (`[Solution](solution.md)`) are rewritten to use the templated title so Confluence can resolve them.

| Template | `problem.md` becomes |
|----------|---------------------|
| `%title%` (default) | Problem |
| `(CW) %title%` | (CW) Problem |
| `CW.Core - %title%` | CW.Core - Problem |

### Multiple publish targets

To add more targets later, add another key under `publish`:

```json
{
  "publish": {
    "confluence": { "baseUrl": "...", "rootPageId": "..." },
    "sharepoint": { "siteUrl": "..." }
  }
}
```

Each connector reads only its own key and ignores the rest.

Validate your manifest against `manifest.schema.json` in this directory.

## Develop

### Get the code

```bash
git clone https://github.com/shobman/aidos.git
cd aidos/src/connectors/confluence
npm install
```

Only one dependency (`marked` for markdown parsing). No test suite — the connector has been production-tested by running against real Confluence spaces.

### Local dry-run

The script has a built-in dry-run mode that previews the full page hierarchy and converted bodies without calling the Confluence API. No authentication required.

```bash
cd src/connectors/confluence
node publish.js ../../../.aidos/manifest.json --dry-run
```

(Point the manifest path at any `.aidos/manifest.json` you want to test against. The command above assumes you're running from the connector directory and testing the repo's own `.aidos/` folder.)

Output shows:

- Page hierarchy with indentation matching Confluence nesting
- Properties and labels for each page
- Whether each folder page is sourced from a `.md` file or auto-generated

### Live local run

For a real publish run from your machine (not GitHub Actions), set credentials in the environment:

```bash
export CONFLUENCE_EMAIL=you@example.com
export CONFLUENCE_TOKEN=your-api-token
node publish.js ../../../.aidos/manifest.json
```

Use this only when you need to debug publish behaviour outside CI — the canonical publish path is the GitHub Actions workflow.

### Project structure

```
src/connectors/confluence/
├── publish.js              ← Single entry point — walks .aidos/, converts markdown, publishes
├── manifest.schema.json    ← JSON Schema for .aidos/manifest.json
├── package.json            ← { "type": "module", dependencies: { "marked": "..." } }
└── README.md               ← This file
```

The script is ~700 lines, self-contained, ESM, uses Node 20+ built-in fetch. Follow the structure (constants → auth → API helpers → markdown transforms → publish logic → main).

### Versioning

No semver. The connector is versioned alongside the aidos repo. The GitHub Actions workflow pulls from `shobman/aidos@main` (or a pinned tag if you want stability). Bump the `CONNECTOR_VERSION` constant in `publish.js` to force republish of all pages — useful after output format changes.
