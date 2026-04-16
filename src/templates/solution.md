<!--
SOLUTION ARTIFACT TEMPLATE

What this is:
  The Solution artifact answers: how does the proposed response work as a
  system, including options and trade-offs? It bridges the Problem (what
  we're solving) and the Tech Design (how we build it).

Rubric criteria:
  Core Rubric (C1–C13) — applied to every artifact. Core criteria are
  cross-cutting: you address them through the sections below, not in
  separate sections. In particular:
    C1  Alignment to goals — every element traces to a Problem goal
    C2  Simplicity — simplest approach that solves the problem
    C3  Explicit trade-offs — choices are documented with reasoning
    C4  Failure modes — what can go wrong in the solution design
    C5  Testability — every design choice is verifiable
    C6  Observability — how you'd know if the solution is working
    C7  Security — security implications addressed
    C8  Operational impact — operational burden and ownership
    C9  Reversibility — what's hard to undo
    C10 Future team readiness — no tribal knowledge
    C11 Internal consistency — consistent terminology
    C12 No duplication — reference the Problem, don't restate it
    C13 Single unit of work — one coherent solution

  Solution Rubric (S1–S9) — discipline-specific criteria:
    S1  Conceptual coherence → Solution Overview
    S2  Workflow completeness → Workflows
    S3  Edge cases → Edge Cases
    S4  Minimum viable slice → Minimum Viable Slice
    S5  Alternatives considered → Alternatives Considered
    S6  Dependency identification → Dependencies
    S7  Migration and transition → Migration and Transition
    S8  Actor identification → Actors
    S9  Constraint compliance → Constraint Compliance

Coherence check:
  The Solution is audited against the Problem artifact. Every goal in the
  Problem has a corresponding response here. Nothing here addresses a
  problem that wasn't stated. If something in the Problem changed, this
  artifact reflects that change.

Scaling depth:
  Epic — full depth. The solution is the system-level design.
  Feature — focused on this feature's response. Reference the Epic
  solution for context.
  Story — keep sections brief.
-->

# Solution: [title]

**Status:** DRAFT | REVIEW | ACCEPTED
**AIDOS Version:** 1.0.0
**Problem:** [link to Problem artifact]

---

## Solution Overview
<!-- S1: Conceptual coherence. How the solution works as a system.
     All parts connect, no contradictions, no orphaned pieces. -->

[High-level description of the solution. How the pieces fit together
and why this approach was chosen.]

## Actors
<!-- S8: Actor identification. Who and what interacts with the solution.
     Frequency, skill expectations where human action is required. -->

| Actor | Type | Interaction | Frequency |
|---|---|---|---|
| | Person / Team / System | | |

## Workflows
<!-- S2: Workflow completeness. Trace every workflow end to end.
     Entry points, decision points, handoffs, exit points. No gaps. -->

### [Workflow name]

1. [Entry point]
2. [Step — what happens, who acts, what's the input/output]
3. [Decision point — what determines the path]
4. [Exit point — what state the system is in when done]

## Edge Cases
<!-- S3: Edge cases. Boundary conditions, unusual inputs, atypical
     scenarios. Explicitly deferred items include rationale. -->

| # | Scenario | Handling | In Scope? |
|---|---|---|---|
| E1 | | | |

## Alternatives Considered
<!-- S5: Alternatives considered. At least one alternative evaluated.
     The chosen approach is justified, not just the first idea. -->

| Option | Description | Pros | Cons | Verdict |
|---|---|---|---|---|
| A — [chosen] | | | | **Selected** — [reason] |
| B | | | | Rejected — [reason] |

## Dependencies
<!-- S6: Dependency identification. External systems, teams, services,
     data sources, decisions. Status: available, committed, assumed, at risk. -->

| # | Dependency | Type | Status | Risk if Unavailable |
|---|---|---|---|---|
| DEP1 | | | | |

## Migration and Transition
<!-- S7: Migration and transition. How to get from current state to
     proposed state. Cutover, backward compatibility, rollback. -->

[Current state. Target state. How users, data, or processes move
from one to the other. What happens if the transition needs to be
reversed.]

## Constraint Compliance
<!-- S9: Constraint compliance. Map each constraint from the Problem
     to how this solution respects it. Flag gaps explicitly. -->

| Constraint | How Addressed | Gap? |
|---|---|---|
| [from Problem K1] | | |

## Minimum Viable Slice
<!-- S4: Minimum viable slice. The smallest version that delivers
     real value. Viable, not just minimal. -->

**What's in the first slice:**
- [Capability — traces to Problem goal]

**What's deferred:**
- [Capability — reason for deferral]

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
