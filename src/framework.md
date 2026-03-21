# AI Delivery Operating System

*Named for Aidos (αἰδώς) — the ancient Greek spirit of restraint, modesty, and respect. The force that holds you back from acting without thinking.*

---

## Purpose

AI has dramatically lowered the cost of producing first-pass artifacts, prototypes, and implementation. A spec that took a sprint can be drafted in an afternoon. A feature that took a team can be prototyped by one person with an agent.

But the thinking hasn't got cheaper. Understanding the problem, aligning stakeholders, and making judgment calls — that's as slow and expensive as it ever was. And when implementation is fast, bad assumptions compound faster too.

AIDOS exists to improve decision quality before implementation speed compounds mistakes. It is an AI-era delivery assurance framework: a structured way to think, decide, and verify before you build — and to keep verifying as you go.

---

## AIDOS at a Glance

```
┌─────────────────────────────────────────────────────────┐
│                    ARTIFACT STACK                        │
│                                                         │
│   Problem ──→ Solution ──→ Tech Design ──→ Testing      │
│                                                         │
│   Each artifact is checked against its own rubric       │
│   AND against the artifact before it.                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   BUILDER          creates artifacts with AI assistance │
│   AUDITOR          reviews against rubrics + coherence  │
│                    (never the same person)               │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   RUBRICS          Pass / Partial / Fail with evidence  │
│   ISSUES           tracked inline, escalated with       │
│                    decision packets                      │
│   DECISIONS        captured with rationale and date     │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   RHYTHM           sprint → park → align → feed back    │
│   IMPROVEMENT      retrospectives harden the rubrics    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Minimum viable adoption:** one artifact, one rubric, separate builder and auditor, explicit issue and decision capture. You can adopt AIDOS incrementally — start with the Problem artifact and the Core Rubric, and expand from there.

---

## Core Model

### The Artifact Stack

Every delivery progresses through four questions:

| Artifact | Question | Lens |
|---|---|---|
| **Problem** | What is happening, for whom, why it matters, and what success looks like | Product |
| **Solution** | How the proposed response works as a system, including options and trade-offs | Analysis |
| **Tech Design** | How the solution will be implemented — components, interfaces, data, constraints | Architecture |
| **Testing** | How we verify it works and trace results back to requirements | Quality |

These aren't phases. They're living documents that build on each other progressively. When new information arrives, it flows backward too — a discovery during Tech Design might reshape the Solution.

### The Coherence Rule

Each artifact is audited against its own quality rubric **and** against the artifact that precedes it.

The Solution must visibly solve the Problem. The Tech Design must implement the Solution. The Testing must verify the Tech Design against the Solution's goals. If the chain breaks, you find out during a review — not in production.

This isn't bureaucracy. It's traceability. When something goes wrong, you can trace backward through the chain. It either holds or it breaks at an identifiable point.

### Builder / Auditor Separation

AIDOS depends on separation between artifact creation and artifact audit. The same person cannot be both builder and final judge.

**Builder** — creates and modifies artifacts. The builder holds the pen. A human directs the work, provides context and decisions. AI assists with drafting, structuring, and refining. The builder captures everything: decisions, assumptions, issues, trade-offs. If it happened in the session, it goes in the artifact.

**Auditor** — reviews artifacts against rubrics and checks coherence with the preceding artifact. The auditor does not fix problems — they identify them and send findings back to the builder. Findings are classified as:

- **Bug** — must fix before proceeding. Something is wrong, missing, or contradictory.
- **Risk** — decision required. The human decides: accept, mitigate, or defer.
- **Idea** — noted, not actioned unless chosen. Ideas do not drive additional audit passes.

**The three-pass rule.** Pass 1 is the full assessment. Pass 2 re-audits only the criteria that failed. Pass 3 is the final attempt. After three passes, repeated failure usually signals a structural issue upstream — a flawed assumption or decision in a preceding artifact — not a local drafting problem. Escalate up the stack.

### Rubrics

Every artifact is assessed against two rubric layers:

**Core Rubric** — universal criteria that apply to every artifact at every scale. Alignment to goals. Simplicity. Explicit trade-offs. Failure modes. Testability. Observability. Security. Operational impact. Reversibility. Future team readiness. Unit coherence. No duplication.

**Discipline Rubric** — criteria specific to each artifact type. The Problem rubric checks clarity, stakeholder identification, goal measurability, root cause confidence. The Solution rubric checks conceptual coherence, workflow completeness, edge cases, minimum viable slice. The Tech Design rubric checks component clarity, integration points, data model, coding agent readiness. The Testing rubric checks coverage, traceability, scenario completeness, exit criteria.

Each criterion has a defined "what pass looks like." The auditor assesses Pass, Partial, or Fail with cited evidence. The evidence requirement is what gives rubrics teeth — you can't hand-wave a Pass. Partials are accepted or rejected by the human directing the audit, not waved through. The artifact doesn't advance until bugs are fixed.

Full rubric definitions are in `rubrics/`.

### The Artifacts Are the Interface

The artifacts are the interface between people, between sessions, and between humans and AI. If it's not in the document, it doesn't exist for the next consumer — whether that consumer is a colleague, a coding agent, or your future self resuming work next week.

This is especially important for AI-assisted work, where sessions are transient. The artifact is what persists. Everything else is conversation that disappears.

---

## Scaling

Not every piece of work needs the full stack at every level of detail.

**Epic** — a large initiative spanning multiple sprints and people. Each artifact is a separate document. Problem, Solution, Tech Design, and Test Strategy get thorough treatment because the cost of getting them wrong is high and many people depend on them.

**Feature** — a specific deliverable, one to two sprints, typically one builder. Artifacts can be separate documents or combined into one file — the builder decides based on the work. The Problem section can be lightweight if the Epic Problem is strong. The Tech Design section carries the most weight — it's the brief for the coding agent.

**Story** — a day or less of work. Lean artifacts that inherit heavily from the parent feature. At story scale, artifacts use familiar names — Context, User Story, Technical Approach, Acceptance Criteria — but they map directly to the four artifact types and are still assessed against the same rubrics at lighter depth.

| Artifact | Epic | Feature | Story |
|---|---|---|---|
| Problem | Problem (full depth) | Problem (focused) | Context |
| Solution | Solution (system-level) | Solution (feature-scope) | User Story |
| Tech Design | Tech Design (architecture) | Tech Design (implementation brief) | Technical Approach |
| Testing | Test Strategy | Test Plan | Acceptance Criteria |

The templates in `templates/` provide maximum structure. The builder scales down based on the work — keeping sections brief or skipping them, not switching to a different template. A one-line Assumptions section is better than no Assumptions section.

Use judgment. A solo developer building a well-understood API might only need a Problem and a Tech Design. A complex multi-team initiative needs the full stack at epic and feature scale. The framework provides the structure; the human decides how much to use.

---

## Issues and Decisions

Artifacts accumulate issues and decisions as they're built.

**Issues** are open questions, risks, or unknowns. They're tracked inline in the artifact with status: OPEN, SOCIALISE (needs discussion), ESCALATE (needs stakeholder decision), or DEFERRED.

**Decisions** are resolved issues. When an issue resolves, it moves from the Issues table to the Decisions table with rationale and date. Decisions don't disappear — they're the audit trail.

**Decision Packets.** When an issue needs escalation, it gets packaged with: the options available, a recommendation, downstream impact, and who needs to decide. This means a stakeholder can make an informed call without re-reading the entire artifact.

**Issues Log.** Escalated items are copied to a centralised Issues Log that tracks what's waiting for a decision across the project and what's been decided. This prevents decisions from getting lost in meeting notes and Slack threads.

---

## Working Rhythm

AIDOS introduces a pulse-based working rhythm inside whatever broader planning cadence the team uses — sprints, Kanban, or ad hoc project cycles.

1. **Sprint** — the builder works with AI to create or advance an artifact. Fast, focused, captured.
2. **Park** — the artifact is committed, status updated, ready for review. The builder moves to the next piece of work.
3. **Align** — humans review, react, decide. Meetings happen when they're needed.
4. **Feed back** — meeting outcomes flow into the next builder session. Decisions and corrections are processed with AI in minutes.
5. **Sprint again** — the next artifact or the next iteration, informed by everything that just happened.

The artifacts preserve state across parallel work. When Project A is parked waiting for stakeholder review, you sprint on Project B. The framework ensures nothing is lost in the switch.

### Who Can Build

AI has expanded who can productively draft artifacts. A developer can frame a Problem. A product owner can sketch a Tech Design. An analyst can spike a prototype. The framework reduces dependence on role-based document production, but not on role-based judgment. Stakeholder synthesis, decision hygiene, system coherence — those skills still matter. They just don't have to bottleneck the production of every artifact.

The counter-risk is real: AI enables people to produce plausible first passes outside their specialty, which can create false confidence. That's exactly why the auditor role exists. Anyone can build. But the work must survive a structured audit by someone who didn't create it.

---

## Methodology Fit

AIDOS provides artifact structure and quality standards that work regardless of how you organise delivery.

**When upfront specification works** — the domain is well-known, the decision-maker is one person, the output is for machines to execute — a detailed spec handed to an AI coding agent is effective. Go deep on Problem and Tech Design, minimise iterative checkpoints.

**When iteration is essential** — the output is for humans to interact with, multiple stakeholders need to align, you won't know if it's right until someone sees it — short cycles with frequent feedback are essential. Light Problem, spike fast, show early, iterate.

**Most real work is a mix.** The artifacts and rubrics don't change — only the rhythm and the number of human checkpoints.

The calibration questions at the start of a project:

- How many decision-makers are involved?
- How well-understood is the domain?
- Is the output for humans to interact with or machines to execute?
- How reversible is a wrong choice?
- Does anyone own the outcome?

---

## Rubric Evolution

Rubrics encode lessons from experience. A criterion like "operational ownership is identified and accepted" exists because someone got six weeks into a project and discovered nobody would own the result.

The improvement loop:

1. **Retrospective** — the team identifies what burned them.
2. **Builder session** — a proposed rubric amendment is drafted. New criteria, modified pass conditions, or criteria to retire.
3. **Auditor session** — the proposed changes are reviewed. Are they testable? Non-redundant? Do they actually address the pain point?
4. **Merge** — approved changes enter the rubric with a changelog entry recording what changed, why, and which project drove it.

A good rubric criterion is testable (two people could independently assess Pass, Partial, or Fail and mostly agree), non-redundant (it catches something no other criterion covers), grounded (it comes from real delivery pain), and actionable (if it fails, the builder knows what to fix).

---

## What AIDOS Is Not

AIDOS is a thinking-and-assurance layer. It does not replace:

- **Product strategy** — deciding what to invest in
- **Engineering standards** — coding conventions, architecture patterns, CI/CD
- **Team structure** — how people are organised
- **Backlog or project tools** — Jira, Linear, GitHub Issues, Trello
- **Incident management** — what happens when things break in production
- **Delivery planning** — capacity, timelines, dependencies

It sits alongside those things. The artifacts feed into your planning tools. The rubrics complement your engineering standards. The audit process works with whatever review culture you already have.

---

## For AI Agents

The Tech Design artifact is explicitly designed as a coding agent brief. Components, integration points, data model, error handling, constraints — all explicit. An AI agent receiving a Tech Design that passed audit has context that most developers would spend days building up through conversation and code archaeology.

The full artifact chain — Problem through Solution through Tech Design — gives an agent something rare: *why* the code exists, not just what it should do. When an agent understands the Problem, it makes better implementation decisions. When it can reference the Solution, it resolves ambiguities without asking.

---

## Worked Example

**Scenario:** A team needs to improve how advisers access fund commentary.

### Problem

Advisers can't find the latest approved fund commentary quickly enough. The current process requires navigating three separate systems, taking approximately 15 minutes per lookup. This affects 200+ advisers making daily investment decisions. Goal: reduce commentary access time to under 30 seconds. Non-goal: redesigning the commentary authoring workflow.

### Solution

Add a commentary summary component to the adviser product page. Pull the latest approved version from the existing commentary source, surface it inline. Two options were considered: embedded component (chosen) vs. separate commentary hub page (rejected — adds navigation, doesn't solve the core access time problem).

### Tech Design

Query the approved source API, cache responses daily, expose via the existing service layer. Component renders markdown with fallback to "no commentary available." Error handling: stale cache serves last-known-good; API timeout after 3 seconds triggers fallback. No new database tables required.

### Testing

Validate source freshness (commentary updates within 24h), permissions (only approved commentary surfaces), rendering across supported browsers, fallback states (API down, no commentary exists, stale cache). Every test traces to a requirement in the Solution.

### Audit Finding (Example)

On Pass 1, the auditor flagged the Tech Design against the Problem:

| Criterion | Assessment | Evidence | Classification |
|---|---|---|---|
| A2: Integration points | Partial | API rate limits not addressed. 200+ advisers hitting cached endpoint simultaneously on market open — is the cache refresh strategy sufficient? | Risk |

The builder addressed it by adding a pre-warm cache job at 6am, before market open. Pass 2 cleared.

### Escalated Decision (Example)

During the Problem stage, an issue was escalated:

> **I3: Commentary ownership.** Three teams currently publish commentary with no single approval process. Who is the authoritative source?
>
> **Options:** (A) Use the most recently published from any team. (B) Designate one team as authoritative. (C) Surface all with team attribution.
>
> **Recommendation:** Option B — designate one authoritative source. Simplest implementation, clearest accountability.
>
> **Downstream impact:** If Option A or C, the Tech Design needs merge/conflict logic and the Testing scope expands significantly.

Stakeholder decided Option B. Issue moved to Decisions table.

---

## Principles

1. **Human directs, AI holds the pen.** AI creates and modifies. The human steers and decides.
2. **The artifact is the interface.** Everything goes in the document. If it's not captured, it doesn't exist.
3. **Just enough to get the thing done.** Good enough to build the next step from — move on. Don't polish.
4. **Rubrics define done.** Quality is assessed against explicit criteria with evidence, not vibes.
5. **The stack is structure, not sequence.** Work flows forward and backward. Earlier artifacts aren't frozen.
6. **Separate building from auditing.** The person who built it is not the person who checks it.
7. **Coherence across artifacts.** Each artifact is checked against its own rubric and the artifact before it.
8. **Capture decisions inline.** When a decision is made, it goes in the artifact immediately with rationale.
9. **Surface issues early.** Unknowns become explicit issues. Escalations get decision packets. Nothing hides.
10. **Challenge scope before committing.** Every item in scope must trace to a stated need. YAGNI.
11. **Show before you're ready.** A working prototype in front of a real stakeholder this week beats a polished solution in six weeks.
12. **The framework waits for humans.** AI makes action fast. Decisions still need people. The rhythm respects that.
13. **Rubrics evolve.** Retrospectives feed lessons back into the quality standards. The framework improves with use.
