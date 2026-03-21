<!--
COMBINED ARTIFACT TEMPLATE

What this is:
  A single document containing all four AIDOS artifacts as sections:
  Problem, Solution, Tech Design, and Testing. This is for Feature-scale
  work where one document covers everything.

  The content is identical to the four standalone templates (problem.md,
  solution.md, tech-design.md, testing.md) — just in one file. If the
  work grows beyond Feature scale, extract sections into separate files.
  The content transfers directly; no restructuring needed.

How to use:
  1. Start with the Problem section. Get it to DRAFT or STABLE before
     going deep on Solution.
  2. Work forward through the stack. Each section builds on the one
     before it.
  3. When new information surfaces, flow it backward — a discovery in
     Tech Design might reshape the Solution or the Problem.
  4. Each section has its own status. They don't all advance together.

Rubric criteria:
  Each section is audited against its own Discipline Rubric AND the
  Core Rubric (C1–C13). See the standalone templates for the full
  criterion-to-section mapping.

  Problem section:  Core + Problem Rubric (P1–P10)
  Solution section: Core + Solution Rubric (S1–S9)
  Tech Design section: Core + Tech Design Rubric (A1–A10)
  Testing section:  Core + Testing Rubric (T1–T9)

Coherence checks:
  Solution is checked against Problem.
  Tech Design is checked against Solution.
  Testing is checked against Tech Design and Solution.

Scaling:
  Feature — the primary use case. One builder, one to two sprints.
  The Problem section can be lightweight if the Epic problem is strong.
  The Tech Design section carries the most weight — it's the brief
  for the coding agent.

  If a section needs more depth than this format allows, extract it
  into its own file using the corresponding standalone template.
-->

# [Feature title]

**Parent:** [link to Epic artifacts, if applicable]

---

## Problem

**Status:** NOT STARTED | DRAFT | STABLE | AUDITED

### Problem Statement
<!-- P1: Clarity -->

[What is happening, who is affected, and why it matters.]

### Stakeholders
<!-- P2: Stakeholder identification -->

| Stakeholder | Role | Interest |
|---|---|---|
| | | |

### Goals and Success Criteria
<!-- P3: Goal measurability -->

| # | Goal | Success Metric | How Verified |
|---|---|---|---|
| G1 | | | |

### Non-Goals
<!-- P6: Non-goals -->

- [Related concern deliberately excluded — reason.]

### Root Cause Analysis
<!-- P4: Root cause confidence -->

[Symptoms vs causes. Evidence or confidence level.]

### Scope
<!-- P5: Scope justification -->

**In scope:**
- [Item — traces to G1]

**Out of scope:**
- [Item — reason]

### Impact and Urgency
<!-- P9: Impact and urgency -->

[Quantified cost. Why now.]

### Assumptions
<!-- P7: Assumptions surfaced -->

| # | Assumption | If Wrong | Critical? |
|---|---|---|---|
| A1 | | | |

### Constraints
<!-- P8: Constraints identified -->

| # | Constraint | Type | Source |
|---|---|---|---|
| K1 | | | |

### Existing Alternatives
<!-- P10: Existing alternatives considered -->

| Alternative | Why Insufficient |
|---|---|
| | |

---

## Solution

**Status:** NOT STARTED | DRAFT | STABLE | AUDITED

### Solution Overview
<!-- S1: Conceptual coherence -->

[How the solution works as a system. How the pieces fit together.]

### Actors
<!-- S8: Actor identification -->

| Actor | Type | Interaction | Frequency |
|---|---|---|---|
| | | | |

### Workflows
<!-- S2: Workflow completeness -->

1. [Entry point]
2. [Step — what happens, who acts]
3. [Decision point — what determines the path]
4. [Exit point]

### Edge Cases
<!-- S3: Edge cases -->

| # | Scenario | Handling | In Scope? |
|---|---|---|---|
| E1 | | | |

### Alternatives Considered
<!-- S5: Alternatives considered -->

| Option | Description | Pros | Cons | Verdict |
|---|---|---|---|---|
| A — [chosen] | | | | **Selected** — [reason] |
| B | | | | Rejected — [reason] |

### Dependencies
<!-- S6: Dependency identification -->

| # | Dependency | Status | Risk if Unavailable |
|---|---|---|---|
| DEP1 | | | |

### Migration and Transition
<!-- S7: Migration and transition -->

[Current state → target state. Cutover, compatibility, rollback.]

### Constraint Compliance
<!-- S9: Constraint compliance -->

| Constraint | How Addressed | Gap? |
|---|---|---|
| | | |

### Minimum Viable Slice
<!-- S4: Minimum viable slice -->

**In first slice:**
- [Capability — traces to goal]

**Deferred:**
- [Capability — reason]

---

## Tech Design

**Status:** NOT STARTED | DRAFT | STABLE | AUDITED

### Components
<!-- A1: Component clarity -->

| Component | Responsibility | Boundary |
|---|---|---|
| | | |

### Integration Points
<!-- A2: Integration points -->

| Interface | From → To | Protocol | Data Format |
|---|---|---|---|
| | | | |

### Data Model
<!-- A3: Data model -->

| Entity | Storage | Lifecycle | Notes |
|---|---|---|---|
| | | | |

### Error Handling
<!-- A4: Error handling strategy -->

| Layer | Error Category | Handling | Surfaced To |
|---|---|---|---|
| | | | |

### Technology Choices
<!-- A5: Technology choices justified -->

| Choice | Rationale |
|---|---|
| | |

### Performance and Capacity
<!-- A6: Performance and capacity -->

| Metric | Target | Breaking Point |
|---|---|---|
| | | |

### Deployment and Environment
<!-- A7: Deployment and environment -->

[Deployment process. Configuration. Secrets. Environment differences.]

### Migration Path
<!-- A8: Migration path -->

[Current → target. Rollback. Backward compatibility.]

### Constraints and Boundaries
<!-- A9: Constraints and boundaries -->

- [Must not: guardrails for the implementer]

### Coding Agent Brief
<!-- A10: Coding agent readiness -->

**Acceptance criteria:**
- [Specific, testable conditions]

**File and module structure:**
- [Where new code goes, naming conventions]

**Implementation boundaries:**
- [What the agent should and should not change]

---

## Testing

**Status:** NOT STARTED | DRAFT | STABLE | AUDITED

### Coverage Map
<!-- T1: Coverage. T2: Traceability. -->

| Requirement / Component | Source | Test Case(s) | Gap? |
|---|---|---|---|
| | | | |

### Test Scenarios
<!-- T3: Scenario completeness. T5: Expected results. -->

| # | Scenario | Preconditions | Steps | Expected Result | Priority |
|---|---|---|---|---|---|
| TC1 | | | | | Must-pass / Should-pass |

### Error and Failure Scenarios

| # | Scenario | Trigger | Expected Behaviour | Priority |
|---|---|---|---|---|
| TC-E1 | | | | |

### Test Data and Preconditions
<!-- T6: Test data and preconditions -->

| Data Set | Description | Source | Setup | Teardown |
|---|---|---|---|---|
| | | | | |

### Environment Requirements
<!-- T7: Environment requirements -->

| Environment | Purpose | Dependencies | Available? |
|---|---|---|---|
| | | | |

### Regression Scope
<!-- T8: Regression awareness -->

| Area | Risk | Regression Tests |
|---|---|---|
| | | |

### Exit Criteria
<!-- T4: Exit criteria. T9: Risk-based prioritisation. -->

- [ ] [Must-pass scenarios executed and passing]
- [ ] [Every goal has at least one passing test]
- [ ] [No regressions in identified areas]

---

## Issues

| # | Source | Issue | Status |
|---|---|---|---|
| I1 | | | OPEN / SOCIALISE / ESCALATE / DEFERRED |

## Decisions

| # | Source | Issue | Resolution | Date |
|---|---|---|---|---|
| D1 | | | | |
