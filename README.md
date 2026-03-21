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

A team needs to improve how advisers access fund commentary:

| Artifact | What Gets Captured |
|---|---|
| **Problem** | Advisers can't find the latest approved fund commentary quickly enough. Current process requires navigating three systems. Time cost: ~15 min per lookup. |
| **Solution** | Add a commentary summary component to the product page. Pull from the approved source, surface the latest version inline. |
| **Tech Design** | Query approved source API, cache daily, expose via existing service layer. Component renders markdown with fallback to "no commentary available." |
| **Testing** | Validate source freshness, permissions, rendering across browsers, fallback states. Every test traces to a requirement in the Solution. |

The Problem artifact gets audited: is the stakeholder impact clear? Are the goals measurable? Is the scope bounded? Then the Solution gets audited against the Problem: does it actually address the stated goals? Then the Tech Design against the Solution. The chain holds or it breaks at an identifiable point.

---

## Quick Start

1. Read [`src/framework.md`](src/framework.md) — the mechanics, rubrics, and operating model.
2. Pick your scale: **Epic** (big initiative), **Feature** (one deliverable), or **Story** (a day's work).
3. Open any AI chat. Load the [builder prompt](src/prompts/builder-prompt.md) and the relevant template.
4. Build the Problem first. Get it reviewed. Then Solution. Then Tech Design. Then Testing.
5. Have someone who didn't build it [audit](src/prompts/auditor-prompt.md) against the rubrics and the preceding artifact.

That's it. No tooling to install. No platform to adopt. Markdown files, an AI, and discipline.

---

## What's in the Repo

```
src/
├── framework.md              ← The full operating model — start here
├── rubrics/
│   ├── core.md               ← Universal criteria for every artifact
│   ├── problem.md            ← Problem artifact criteria (Product lens)
│   ├── solution.md           ← Solution artifact criteria (Analysis lens)
│   ├── tech-design.md        ← Tech Design artifact criteria (Architecture lens)
│   └── testing.md            ← Testing artifact criteria (Quality lens)
├── templates/                ← Artifact templates for every scale
└── prompts/
    ├── builder-prompt.md     ← Drop into any AI session
    └── auditor-prompt.md     ← Drop into any AI session
```

Designed to work with any AI tool that supports system prompts or persistent instructions. Also packable as a Claude Skill, and an MCP server is on the roadmap.

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
