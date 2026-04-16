<!--
DEFINITION ARTIFACT TEMPLATE

What this is:
  The Definition is the living, authoritative description of a feature as it
  exists today. It answers: what is this, why does it work this way, and what
  do you need to know to work with it. It is the only AIDOS artifact maintained
  post-delivery — everything else archives.

  The Definition is created at project closure in a deliberate distillation
  session — a separate builder session that reviews what was actually built
  and captures it for maintainers. A project may produce one Definition or
  several; the builder decides the split based on what was delivered.

Audience:
  Someone who was never in the room. A maintainer, an on-call engineer, a
  future team, or an AI agent picking up work on this feature months later.
  No delivery-process language — no references to audit findings, pass
  numbers, or builder sessions.

Rubric criteria:
  Core Rubric (C1–C13) — applied to every artifact. Core criteria are
  cross-cutting: you address them through the sections below, not in
  separate sections.

  Definition Rubric (F1–F8) — discipline-specific criteria. Each section
  below maps to one or more of these:
    F1  Outcome accuracy → What This Is
    F2  Key trade-offs preserved → Why It Works This Way
    F3  Maintainer orientation → What This Is, How to Change It Safely
    F4  Known limitations and debt → Known Limitations and Debt
    F5  Operational context → Operational Context
    F6  Domain placement → Domain Placement
    F7  Standalone comprehension → all sections (the Definition must stand alone)
    F8  Currency → Status and Last Updated fields

Coherence check:
  The Definition is audited against the Solution and Tech Design (and the
  actual deployed system where observable). The auditor verifies that the
  Definition accurately reflects what was built, not what was planned.

Scaling depth:
  Epic — separate Definition document. Primary surviving artifact.
  Feature — separate Definition if independently deployed. Otherwise,
  Definition section appended to the combined document.
  Story — no Definition. Stories inherit from their parent Feature or Epic.

Status progression:
  DRAFT → REVIEW → ACCEPTED → CURRENT
  CURRENT signals the Definition is being actively maintained post-delivery.
-->

# Definition: [title]

**Status:** DRAFT | REVIEW | ACCEPTED | CURRENT
**AIDOS Version:** 1.0.0
**Domain:** [product domain path]
**Delivered:** [date]
**Last Updated:** [date]
**Source Artifacts:** [links to archived delivery artifacts]

---

## What This Is
<!-- F1: Outcome accuracy. What was actually built and deployed.
     F3: Maintainer orientation. Written for someone who was never in the room.
     Plain language. One to three paragraphs. -->

[What this system, feature, or component does. What it replaced or changed.
Where it fits in the broader product.]

## Why It Works This Way
<!-- F2: Key trade-offs preserved. The decisions that shaped the current
     behaviour. Not every decision — the ones a maintainer needs to understand. -->

| Decision | Options Considered | Choice | Why |
|---|---|---|---|
| | | | |

## Known Limitations and Debt
<!-- F4: Known limitations and debt. What was consciously left undone.
     Include BACKLOG items from the Overflow Log that affect this feature. -->

- [Limitation or debt item — what it is, why it was accepted, impact on
  current behaviour.]

## Operational Context
<!-- F5: Operational context. For the on-call engineer. Enough to orient
     without reading the full Tech Design. -->

**Owner:** [team or individual responsible in production]
**Monitoring:** [what's watched and where — dashboards, alerts, health checks]
**Failure modes:** [what breaks and what happens when it does]
**Runbook:** [link to runbook, or inline if brief]

## How to Change It Safely
<!-- F3: Maintainer orientation. What you need to know to modify this feature.
     Dependencies, gotchas, areas of fragility, test coverage notes. -->

[Key dependencies. Integration points that are fragile or have known quirks.
What to test after making changes. What not to touch without understanding
the implications.]

## Domain Placement
<!-- F6: Domain placement. Where this Definition lives in the product taxonomy.
     Related Definitions in the same domain. -->

[Path in the product taxonomy. Related features in this domain. How this
feature relates to its neighbours.]

---

## Issues

| # | Source | Issue | Status |
|---|---|---|---|
| I1 | | | OPEN / SOCIALISE / ESCALATE |

## Decisions

| # | Source | Issue | Resolution | Decided By | Date |
|---|---|---|---|---|---|
| D1 | | | | | |
