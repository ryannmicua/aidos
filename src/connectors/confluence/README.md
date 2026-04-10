# AIDOS Confluence Connector

One-way publish of AIDOS artifacts from a `.aidos/` folder to Confluence.
The repository is source of truth. Confluence is a read-only projection.

## How It Works

The publish script recursively walks the `.aidos/` directory, converts each
markdown file to Confluence storage format (XHTML), and mirrors the folder
structure as a page hierarchy in Confluence.

- **Folders become pages** — subdirectories create parent pages with their
  contents as child pages
- **Status and Owner** are parsed from each file's metadata lines and
  rendered as a Confluence Page Properties table
- **Pages are matched by title** — no IDs stored in the manifest. Delete a
  page in Confluence, re-sync, it recreates cleanly.
- The **root page** gets a Page Properties Report macro that aggregates all
  descendant statuses into a dashboard table

## Git → Confluence Mapping

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

Page titles are derived from filenames: strip `.md`, split on `-`,
title-case each word. `tech-design.md` becomes **Tech Design**.

If your Confluence space has existing pages with common titles (Problem,
Testing, etc.), use `titleTemplate` in the manifest to prefix all titles.
See [Manifest](#manifest).

## Markdown → Confluence Translation

The connector translates standard markdown features into native Confluence
macros for a rich reading experience.

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

### Status lozenge colours

| Status | Colour |
|--------|--------|
| Not Started | Grey |
| Draft | Yellow |
| In Progress | Blue |
| Review | Purple |
| Done | Green |
| Blocked | Red |

Status matching is case-insensitive. Unrecognised values default to Grey.

### Labels

Every published page gets labels automatically:

| Label | Source |
|-------|--------|
| Artifact type | Derived from filename: `problem`, `tech-design`, `testing`, etc. |
| Scale | Inferred from directory structure: root files → `epic`, folder pages → `feature`, their children → `story` |
| `aidos` | Always applied — identifies connector-managed pages |

Scale labels power the root dashboard (separate Epics and Features
tables) and the Stories section on feature pages. Labels enable
Confluence search, CQL filtering, and dashboard reports.

## Prerequisites

- **Confluence Cloud** (not Server/Data Center) — your URL looks like
  `https://<your-org>.atlassian.net`
- **Node.js 20+** for local testing
- A Confluence **API token** — generate at
  https://id.atlassian.com/manage-profile/security/api-tokens
- A **root page** in your Confluence space — create one manually in
  Confluence, then copy its page ID from the browser URL. For a page at
  `https://acme.atlassian.net/wiki/spaces/ENG/pages/123456789/My+Root+Page`,
  the page ID is `123456789`.

## Manifest

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

That's it. Two fields. The script discovers files automatically, parses
metadata from each file, and derives the Confluence space from the root page.

### Title template

If your Confluence space has existing pages with common names, add a
`titleTemplate` to prefix all page titles and avoid collisions:

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

`%title%` is replaced with the title derived from each filename.
Cross-artifact links (`[Solution](solution.md)`) are rewritten to use
the templated title so Confluence can resolve them.

| Template | `problem.md` becomes |
|----------|---------------------|
| `%title%` (default) | Problem |
| `(CW) %title%` | (CW) Problem |
| `CW.Core - %title%` | CW.Core - Problem |

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

## GitHub Actions Workflow

Add this workflow to your consuming repo. PRs dry-run (preview in the
Actions log), merges to main publish for real:

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

Then add `CONFLUENCE_EMAIL` and `CONFLUENCE_TOKEN` as repository secrets:
**Settings → Secrets and variables → Actions → New repository secret**.

If your repo has multiple `.aidos/` folders, omit `manifest-path` and the
workflow will auto-discover all `manifest.json` files.

## Local Testing

Install dependencies once, then run the script with `--dry-run` to see the
page hierarchy and converted bodies without calling the Confluence API:

```bash
cd src/connectors/confluence
npm install
node publish.js ../../../.aidos/manifest.json --dry-run
```

No authentication is required for dry-run. Output shows:
- Page hierarchy with indentation matching Confluence nesting
- Properties and labels for each page
- Whether each folder page is sourced from a `.md` file or auto-generated
