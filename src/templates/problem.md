<!--
PROBLEM ARTIFACT TEMPLATE

What this is:
  The Problem artifact answers: what is happening, for whom, why it matters,
  and what success looks like. It's the foundation of the artifact stack.
  Everything downstream — Solution, Tech Design, Testing — builds on this.

Rubric criteria:
  Core Rubric (C1–C13) — applied to every artifact. Core criteria are
  cross-cutting: you address them through the sections below, not in
  separate sections. In particular:
    C1  Alignment to goals — every element traces to a stated goal
    C2  Simplicity — simplest framing that captures the real problem
    C3  Explicit trade-offs — choices in scoping are documented
    C4  Failure modes — what happens if the problem is misframed
    C5  Testability — goals can be verified
    C6  Observability — you'd know if the problem recurs after solving it
    C7  Security — security implications surfaced where relevant
    C8  Operational impact — who's affected operationally
    C9  Reversibility — which decisions here are hard to undo
    C10 Future team readiness — no tribal knowledge required
    C11 Internal consistency — terminology and framing are consistent
    C12 No duplication — reference, don't copy, from other artifacts
    C13 Single unit of work — one problem, decompose if it's too many

  Problem Rubric (P1–P10) — discipline-specific criteria. Each section
  below maps to one or more of these:
    P1  Clarity → Problem Statement
    P2  Stakeholder identification → Stakeholders
    P3  Goal measurability → Goals and Success Criteria
    P4  Root cause confidence → Root Cause Analysis
    P5  Scope justification → Scope
    P6  Non-goals → Non-Goals
    P7  Assumptions surfaced → Assumptions
    P8  Constraints identified → Constraints
    P9  Impact and urgency → Impact and Urgency
    P10 Existing alternatives considered → Existing Alternatives

Coherence check:
  The Problem artifact is the start of the stack. No preceding artifact
  to check against. At Feature or Story scale, verify consistency with
  the parent Epic problem.

Scaling depth:
  Epic — full depth. Every section is thorough.
  Feature — lighter if the Epic problem is strong. Focus on what's
  specific to this feature.
  Story — most sections can be one line.

  Scale down by keeping sections brief, not by deleting them. A one-line
  Assumptions section that says "inherits from Epic" is better than no
  Assumptions section.
-->

# Problem: [title]

**Status:** DRAFT | REVIEW | ACCEPTED
**AIDOS Version:** 1.0.0
**Parent:** [link to Epic problem, if this is Feature or Story scale]

---

## Problem Statement
<!-- P1: Clarity. State what's wrong, for whom, and why it matters.
     Plain language. No jargon without definition. A reader unfamiliar
     with the project should understand this without prior conversation. -->

[What is happening, who is affected, and why it matters.]

## Stakeholders
<!-- P2: Stakeholder identification. Name every affected party. -->

| Stakeholder | Role | Interest |
|---|---|---|
| | Experiences the problem | |
| | Owns the outcome | |
| | Approves the solution | |
| | Impacted by change | |
| | Can block progress | |

## Goals and Success Criteria
<!-- P3: Goal measurability. Specific, measurable, verifiable.
     "Reduce X to under Y" not "improve Z." -->

| # | Goal | Success Metric | How Verified |
|---|---|---|---|
| G1 | | | |
| G2 | | | |

## Non-Goals
<!-- P6: Non-goals. What this artifact explicitly will not address, and why. -->

- [Related concern deliberately excluded — reason.]

## Root Cause Analysis
<!-- P4: Root cause confidence. Distinguish symptoms from causes.
     State confidence level. Cite evidence where available. -->

**Symptoms observed:**
[What people see and report.]

**Hypothesised root cause:**
[What's actually causing it, with evidence or confidence level.]

## Scope
<!-- P5: Scope justification. Everything here traces to a goal above.
     Nothing crept in without justification. -->

**In scope:**
- [Item — traces to G1]

**Out of scope:**
- [Item — reason for exclusion]

## Impact and Urgency
<!-- P9: Impact and urgency. Quantify where possible. Why now. -->

[Cost of the problem: time lost, revenue at risk, users affected, manual effort.
Why this needs addressing now. What happens if it isn't.]

## Assumptions
<!-- P7: Assumptions surfaced. List each one. Flag critical assumptions
     that would invalidate the problem framing if false. -->

| # | Assumption | If Wrong | Critical? |
|---|---|---|---|
| A1 | | | |

## Constraints
<!-- P8: Constraints identified. Regulatory, technical, organisational,
     timeline, budget. Don't make the Solution author discover these. -->

| # | Constraint | Type | Source |
|---|---|---|---|
| K1 | | | |

## Existing Alternatives
<!-- P10: Existing alternatives considered. Is this already solved?
     Building is not the default — it's justified. -->

| Alternative | Why Insufficient |
|---|---|
| | |

---

## Issues
<!-- Source: where this issue was first identified — an artifact name, session, meeting, or external input. -->

| # | Source | Issue | Status |
|---|---|---|---|
| I1 | | | OPEN / SOCIALISE / ESCALATE |

## Decisions

| # | Source | Issue | Resolution | Decided By | Date |
|---|---|---|---|---|---|
| D1 | | | | | |
