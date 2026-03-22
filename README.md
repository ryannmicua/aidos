# AIDOS — AI Delivery Operating System

*In ancient Greece, Aidos was the spirit of restraint — the inner voice that held you back from hubris. AI gave us the power to build anything. Aidos is the discipline to ask whether we should.*

---

AI collapsed the cost of getting to a first pass. A spec that took a sprint can be drafted in an afternoon. A feature that took a team can be prototyped by one person with an agent. The mechanical cost of software has dropped dramatically.

But the thinking hasn't got cheaper. Humans still need to understand problems, align with each other, and make judgment calls. That part is as slow and expensive as it ever was — and when building is fast, bad assumptions compound faster too.

**AIDOS helps teams think clearly, document decisions, and audit delivery quality — before implementation speed compounds mistakes.**

> 📖 Read [The Hard Part Isn't the Code](docs/manifesto.md) for the full philosophy behind this project.

---

## What This Actually Is

Four artifacts that build on each other:

**Problem** → **Solution** → **Tech Design** → **Testing**

| Artifact | Question It Answers |
|---|---|
| **Problem** | What is happening, for whom, why it matters, and what success looks like |
| **Solution** | How the proposed response works as a system, including options and trade-offs |
| **Tech Design** | How the solution will be implemented — components, interfaces, data, constraints |
| **Testing** | How we verify it works and trace results back to requirements |

Each artifact is checked against its own quality rubric **and** against the artifact before it. The Solution has to actually solve the Problem. The Tech Design has to actually implement the Solution. The Testing has to actually verify the Tech Design against the Solution's goals. If the chain breaks, you find out in a review — not in production.

**Rubrics with teeth.** Not "is this good?" — but "can someone unfamiliar with this project understand the problem without prior conversation?" Pass, Partial, or Fail. With cited evidence. The artifact doesn't advance until bugs are fixed.

**Builder/auditor separation.** AIDOS depends on separation between artifact creation and artifact audit. One person sprints ahead with AI to create the artifact. A different person checks it against the rubrics and the preceding artifact. The same person can't be both builder and final judge. That's the governance.

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

---

## Get Started

AIDOS ships as two AI skills — **Builder** and **Auditor** — packaged for Claude.

| Skill | What It Does |
|---|---|
| **AIDOS Builder** | Runs a builder session. Scaffolds the right document structure for your scale, builds artifacts iteratively, captures decisions and issues inline. |
| **AIDOS Auditor** | Runs an audit session. Assesses artifacts against Core and discipline rubrics, checks coherence with preceding artifacts, classifies findings as Bug / Risk / Idea. |

### Download

Download the latest skill ZIPs from [shobman.github.io/aidos/skills/](https://shobman.github.io/aidos/skills/):

- [`aidos-builder.zip`](https://shobman.github.io/aidos/skills/aidos-builder.zip)
- [`aidos-auditor.zip`](https://shobman.github.io/aidos/skills/aidos-auditor.zip)

### Install on Claude.ai

1. Go to **Settings → Customize → Skills**
2. Click **Upload** and select the ZIP file
3. The skill appears in your skill list — Claude will use it when relevant

### Install in Claude Code

Copy the skill folder into your project:

```
.claude/skills/aidos-builder/    ← contents of the builder ZIP
.claude/skills/aidos-auditor/    ← contents of the auditor ZIP
```

### Manual use (no skill install)

1. Read [`src/framework.md`](src/framework.md) — the mechanics, rubrics, and operating model.
2. Pick your scale: **Epic** (big initiative), **Feature** (one deliverable), or **Story** (a day's work).
3. Open any AI chat. Load the [builder prompt](src/prompts/builder-prompt.md) — it's self-contained.
4. Build through the stack in order — Problem, then Solution, then Tech Design, then Testing — using the document structure for your scale. At Feature and Story scale, multiple artifacts combine into one document.
5. Have someone who didn't build it [audit](src/prompts/auditor-prompt.md) against the rubrics and the preceding artifact.

No tooling to install. No platform to adopt. Markdown files, an AI, and discipline.

---

## What's in the Repo

```
README.md                         ← You are here
CONTRIBUTING.md                   ← How to propose rubric changes
docs/
├── manifesto.md                  ← The philosophy — why decision quality matters
└── images/
    ├── aidos.jpg                 ← Hero image
    └── social.jpg                ← Social sharing image (1280×640)
src/
├── framework.md                  ← The full operating model — start here
├── rubrics/
│   ├── core.md                   ← Universal criteria (C1–C13) for every artifact
│   ├── problem.md                ← Problem criteria (P1–P10) — Product lens
│   ├── solution.md               ← Solution criteria (S1–S9) — Analysis lens
│   ├── tech-design.md            ← Tech Design criteria (A1–A10) — Architecture lens
│   └── testing.md                ← Testing criteria (T1–T9) — Quality lens
├── templates/
│   ├── problem.md                ← Problem artifact template
│   ├── solution.md               ← Solution artifact template
│   ├── tech-design.md            ← Tech Design artifact template
│   ├── testing.md                ← Testing artifact template
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

The Framework Explorer is hosted at [shobman.github.io/aidos](https://shobman.github.io/aidos/). To run locally: `cd site && npm install && npm run dev`.

Designed to work with any AI tool that supports system prompts or persistent instructions.

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
