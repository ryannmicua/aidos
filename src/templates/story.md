<!--
STORY TEMPLATE — LIGHTWEIGHT AIDOS

What this is:
  The minimum viable AIDOS document. For small, well-understood work —
  typically a day or less — where the full artifact stack would be
  overhead. A story inherits heavily from its parent Feature or Epic.

If the work outgrows this format:
  Expand into combined.md (all four artifacts in one file) or split
  into standalone artifact files. The content flows naturally:
    Context → Problem Statement
    Technical Approach → Tech Design
    Acceptance Criteria → Testing
  No restructuring needed — you're expanding, not rewriting.

Applicable rubric criteria (lightweight subset):
  From Core:
    C1  Alignment to goals — traces to parent Feature/Epic goals
    C2  Simplicity — simplest approach
    C3  Explicit trade-offs — choices documented if any
    C4  Failure modes — what can go wrong
    C5  Testability — acceptance criteria are verifiable
    C10 Future team readiness — someone else could pick this up
    C13 Single unit of work — one deliverable

  From Problem: P1 (Clarity), P5 (Scope justification)
  From Tech Design: A1 (Component clarity), A4 (Error handling),
    A9 (Constraints), A10 (Coding agent readiness)
  From Testing: T1 (Coverage), T5 (Expected results)

  Not every criterion needs deep treatment at Story scale. But if
  the auditor can't assess the criteria above from this document,
  it needs more detail — or it needs to graduate to combined.md.
-->

# [Story title]

**Status:** NOT STARTED | DRAFT | STABLE | AUDITED
**Parent:** [link to Feature or Epic]

---

## Context
<!-- What and why. A few sentences. Link to the parent artifact for
     full problem and solution context. -->

[What this story delivers and why it matters. What parent goal it
serves. Enough context that someone unfamiliar with the conversation
can understand the work.]

## Story
<!-- Optional. Skip if the user story format doesn't fit the work. -->

As a [actor],
I want [capability],
so that [outcome].

## Technical Approach
<!-- How to build it. Guardrails. What not to do. This section is the
     coding agent brief at Story scale. -->

[How this will be implemented. Key components or files affected.
Integration points. Error handling approach.]

**Guardrails:**
- [What not to do. Boundaries. Constraints.]

## Acceptance Criteria
<!-- What done looks like. Each criterion is testable. -->

- [ ] [Criterion — specific, verifiable]
- [ ] [Criterion — specific, verifiable]

### Test Cases

| # | Scenario | Expected Result |
|---|---|---|
| TC1 | | |
| TC2 | | |

---

## Issues

| # | Source | Issue | Status |
|---|---|---|---|
| I1 | | | OPEN / SOCIALISE / ESCALATE / DEFERRED |

## Decisions

| # | Source | Issue | Resolution | Date |
|---|---|---|---|---|
| D1 | | | | |
