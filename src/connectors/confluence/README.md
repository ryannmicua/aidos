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
    uses: shobman/aidos/.github/workflows/confluence-publish.yml@v1.0.0
    with:
      manifest-path: .aidos/manifest.json
      dry-run: ${{ github.event_name == 'pull_request' }}
    secrets:
      confluence_email: ${{ secrets.CONFLUENCE_EMAIL }}
      confluence_token: ${{ secrets.CONFLUENCE_TOKEN }}
```

> **Pin a tag, not `@main` or `@sha`.** AIDOS releases are tagged using semver (`vX.Y.Z`). Pinning to a tag means your workflow stays on a known-good version and only moves when you bump the pin. The tag to use is the current AIDOS framework version — see the `VERSION` file at the root of the AIDOS repo.

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

### Duplicate titles

Confluence requires page titles to be **unique within a space**. If an AIDOS artifact's derived title collides with an existing page elsewhere in the target space (not under the AIDOS root), the connector renames the new page by appending a numeric suffix: `Title`, then `Title (1)`, then `Title (2)`.

The connector caps this at **3 total attempts** and hard-fails when all attempts are exhausted. Each rename logs two `WARNING:` lines in the publish output — one naming the collision, one explaining how to resolve it. If you see these warnings, rename the source file (or the conflicting Confluence pages) so titles are unique — the cap exists specifically to force the issue to be resolved rather than silently accumulating duplicates.

On re-publish the connector checks the same suffix ladder, so previously-renamed pages are updated in place rather than creating a new copy each run.

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

In either option, the `**AIDOS Version:**` field in your artifact files is the source of truth for "what AIDOS version should this workflow be running". If artifacts are on v1.1.0, the workflow should be on the v1.1.0 release. Minor-version mismatches between artifacts and the workflow are not guaranteed compatible — migrate artifacts first, then bump the workflow pin. Patch-version drift is safe.

---

## Develop

### Get the code

```bash
git clone https://github.com/shobman/aidos.git
cd aidos/src/connectors/confluence
npm install
```

Only one dependency (`marked` for markdown parsing). Run `npm test` from this directory to execute the unit test suite (Node's built-in `node --test` runner, no external deps).

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
├── title-conflict.js       ← Pure helpers for duplicate-title detection and suffix resolution
├── title-conflict.test.js  ← Unit tests for title-conflict helpers (node --test)
├── manifest.schema.json    ← JSON Schema for .aidos/manifest.json
├── package.json            ← { "type": "module", dependencies: { "marked": "..." } }
└── README.md               ← This file
```

The connector is ESM, uses Node 20+ built-in fetch, and has two modules: `publish.js` (the orchestration script) and `title-conflict.js` (pure helpers for duplicate-title handling). Follow the structure (constants → auth → API helpers → markdown transforms → publish logic → main).

### Versioning

The connector is versioned alongside the aidos repo using semver (`vX.Y.Z`). Consumers pin the GitHub Actions workflow to a tag — see the Install section above for the tag-pinning requirement. Bump the `CONNECTOR_VERSION` constant in `publish.js` to force republish of all pages — useful after output format changes.
