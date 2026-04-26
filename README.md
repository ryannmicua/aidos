# AIDOS — AI Delivery Operating System

*In ancient Greece, Aidos was the spirit of restraint — the inner voice that held you back from hubris. AI gave us the power to build anything. Aidos is the discipline to ask whether we should.*

---

AI collapsed the cost of getting to a first pass. A spec that took a sprint can be drafted in an afternoon. A feature that took a team can be prototyped by one person with an agent. The mechanical cost of software has dropped dramatically.

But the thinking hasn't got cheaper. Humans still need to understand problems, align with each other, and make judgment calls. That part is as slow and expensive as it ever was — and when building is fast, bad assumptions compound faster too.

**AIDOS helps teams think clearly, document decisions, and audit delivery quality — before implementation speed compounds mistakes.**

> 📖 Read [The Hard Part Isn't the Code](docs/manifesto.md) for the full philosophy behind this project.

---

## What This Actually Is

Four delivery artifacts that build on each other, plus one that outlasts the project:

**Problem** → **Solution** → **Tech Design** → **Testing** → *Definition*

| Artifact | Question It Answers |
|---|---|
| **Problem** | What is happening, for whom, why it matters, and what success looks like |
| **Solution** | How the proposed response works as a system, including options and trade-offs |
| **Tech Design** | How the solution will be implemented — components, interfaces, data, constraints |
| **Testing** | How we verify it works and trace results back to requirements |
| **Definition** | What was built, why it works this way, and what a maintainer needs to know |

The first four are delivery artifacts. The Definition is created after the work ships — the living, authoritative description of the feature, maintained as it evolves. Delivery artifacts archive; the Definition persists.

Each artifact is checked against its own quality rubric **and** against the artifact before it. The Solution has to actually solve the Problem. The Tech Design has to actually implement the Solution. The Testing has to actually verify the Tech Design against the Solution's goals. If the chain breaks, you find out in a review — not in production.

**Rubrics with teeth.** Not "is this good?" — but "can someone unfamiliar with this project understand the problem without prior conversation?" Pass, Partial, or Fail. With cited evidence. The artifact doesn't advance until bugs are fixed.

**Builder/auditor separation.** AIDOS depends on separation between artifact creation and artifact audit. One person sprints ahead with AI to create the artifact. A different person checks it against the rubrics and the preceding artifact. The same person can't be both builder and final judge. That's the governance.

> Browse the framework interactively at [shobman.github.io/aidos](https://shobman.github.io/aidos/) — the Framework Explorer renders the full rubrics and templates as a navigable site.

---

## How It Changes the Way You Work

AIDOS uses pulse-based delivery: short bursts of AI-assisted artifact creation, separated by explicit human review checkpoints.

1. **Sprint** — build an artifact with AI in an afternoon that would've taken a sprint.
2. **Park** — commit, update status, move on.
3. **Align** — bring humans in. They review, react, decide.
4. **Feed back** — process their decisions with AI in minutes, not days.
5. **Sprint again** — or switch to another project while this one waits for the next human checkpoint.

The artifacts hold the state so you can context-switch between projects without losing anything. When Project A is parked waiting for stakeholder review, you sprint on Project B.

---

## Example

A team needs to improve how warehouse staff track inventory across multiple locations:

| Artifact | What Gets Captured |
|---|---|
| **Problem** | Warehouse staff can't get accurate stock counts without checking three separate systems, taking ~20 min per lookup. Affects 150+ operators making daily restocking decisions. |
| **Solution** | Add a unified stock dashboard to the warehouse management interface. Pull live counts from existing inventory sources, surface inline. |
| **Tech Design** | Query inventory APIs, cache counts with 15-minute refresh, expose via existing service layer. Component renders stock levels with fallback to "data unavailable." |
| **Testing** | Validate data freshness, permissions, rendering across devices, fallback states. Every test traces to a requirement in the Solution. |

The Problem artifact gets audited: is the stakeholder impact clear? Are the goals measurable? Is the scope bounded? Then the Solution gets audited against the Problem: does it actually address the stated goals? Then the Tech Design against the Solution. The chain holds or it breaks at an identifiable point.

> For a full walkthrough showing the human–AI interaction pattern — assumption surfacing, audit findings, fix cycles, and escalated decisions — see [Worked Example: Deployment Notifications](docs/worked-example.md).

---

## Components

AIDOS is four independent pieces. Pick the ones you need — each has its own README with the same structure: Prerequisites → Install → Use → Develop.

| Component | What it is | README |
|---|---|---|
| **Framework** | The operating model, rubrics, templates, and prompts. Pure markdown, no build. Usable as-is with any AI that accepts a system prompt. | [`src/README.md`](src/README.md) |
| **Skills** | The framework packaged as Claude Skills (Builder, Auditor). Built from the framework, published as ZIPs, installable in Claude.ai and Claude Code. | [`skills/README.md`](skills/README.md) |
| **GitHub MCP Connector** | A local MCP server for Claude Desktop. Lets non-coders read, edit, and publish `.aidos/` artifacts in GitHub repos without touching Git. | [`src/connectors/github/README.md`](src/connectors/github/README.md) |
| **Confluence Publish Connector** | A reusable GitHub Actions workflow that publishes `.aidos/` folders to Confluence on every push. Markdown-to-Confluence translation, content hashing, idempotent. | [`src/connectors/confluence/README.md`](src/connectors/confluence/README.md) |

Each component is optional and independent. Use one, two, three, or all four.

---

## Quick Start

Pick the path that matches how you want to try AIDOS.

**I just want to try it in an AI chat, no install**
Copy [`src/prompts/builder-prompt.md`](src/prompts/builder-prompt.md) into a Claude / ChatGPT / Gemini session and describe what you're delivering. That's it. Audit a different session with [`src/prompts/auditor-prompt.md`](src/prompts/auditor-prompt.md).

**I use Claude and want a proper skill**
Download [`aidos-builder.zip`](https://shobman.github.io/aidos/skills/aidos-builder.zip) and [`aidos-auditor.zip`](https://shobman.github.io/aidos/skills/aidos-auditor.zip), upload to Claude.ai (Settings → Customize → Skills) or extract into `.claude/skills/` in a Claude Code project. Invoke with `/aidos-builder` and `/aidos-auditor`. See [`skills/README.md`](skills/README.md).

**I'm a non-coder and want Claude to author artifacts directly in a GitHub repo**
Set up the GitHub MCP Connector in Claude Desktop: [`src/connectors/github/README.md`](src/connectors/github/README.md). Then install the Skills above. Claude will open a repo, create your personal `aidos/{username}` branch, and publish PRs per your project's write policy.

**I want my artifacts to auto-publish to Confluence**
Add the Confluence publish workflow to your repo: [`src/connectors/confluence/README.md`](src/connectors/confluence/README.md). Every push to your `.aidos/` folder publishes to Confluence. Works on its own, or stacks with the GitHub MCP Connector to close the loop: PO authors via Claude → merge → artifacts appear in Confluence.

---

## How it fits together

The four components compose into a single authoring loop for non-technical contributors:

1. PO or BA opens Claude Desktop → invokes `/aidos-builder` (Skills)
2. Skill detects the GitHub MCP Connector and resolves a repo → creates `aidos/{username}` branch
3. User builds artifacts with the AI (Framework provides the methodology, templates, rubrics)
4. User says "publish" → Skill opens a PR per the manifest's `write` strategy
5. PR merges → Confluence Publish Connector runs via GitHub Actions → artifacts appear in Confluence
6. Engineers see the same artifacts in their IDE via the repo

Each step is optional. You can use the Framework without Skills. Skills without Connectors. GitHub MCP without Confluence. Or any other combination.

For Claude-specific tips and the relationship between pieces, see [CLAUDE.md](CLAUDE.md).

---

## What's in the Repo

```
README.md                         ← You are here
CONTRIBUTING.md                   ← How to propose rubric changes
docs/
├── manifesto.md                  ← The philosophy — why decision quality matters
├── worked-example.md             ← Full walkthrough — the human–AI workflow in action
└── maturity-model.md             ← Agent autonomy spectrum — how the quality model scales
src/
├── framework.md                  ← The full operating model — start here
├── rubrics/
│   ├── core.md                   ← Universal criteria (C1–C12) for every artifact
│   ├── problem.md                ← Problem criteria (P1–P11) — Product lens
│   ├── solution.md               ← Solution criteria (S1–S10) — Analysis lens
│   ├── tech-design.md            ← Tech Design criteria (A1–A10) — Architecture lens
│   ├── testing.md                ← Testing criteria (T1–T9) — Quality lens
│   └── definition.md             ← Definition criteria (F1–F7) — Maintenance lens
├── templates/
│   ├── problem.md                ← Problem artifact template
│   ├── solution.md               ← Solution artifact template
│   ├── tech-design.md            ← Tech Design artifact template
│   ├── testing.md                ← Testing artifact template
│   ├── definition.md             ← Definition artifact template
│   ├── issues-log.md             ← Centralised escalation register
│   ├── overflow-log.md           ← Captures ideas, risks, and insights that don't belong in the current artifact
│   ├── meeting-minutes.md        ← Lean meeting capture
│   └── retrospective.md          ← Rubric evolution mechanism
└── prompts/
    ├── builder-prompt.md         ← Self-contained AI builder session prompt
    └── auditor-prompt.md         ← Self-contained AI auditor session prompt
skills/
├── builder/SKILL.md              ← AIDOS Builder skill for Claude
├── auditor/SKILL.md              ← AIDOS Auditor skill for Claude
└── build.ps1                     ← Assembles and ZIPs skills for distribution
site/                             ← Framework Explorer (GitHub Pages)
```

---

## The Rubrics Evolve

Every project that gets burned by something the rubrics didn't catch can make them better.

Six weeks in, nobody owns it? That's a rubric criterion now. Forgot to check if a vendor already solves this? Rubric criterion. Assumed the regulatory requirement was met without verifying? Rubric criterion.

Not just a framework. A continuously hardened review system, built from real delivery failures.

The most valuable contribution to this repo isn't code. It's: *"We got burned by X. Here's the criterion that would have caught it."*

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

[MIT](LICENSE)
