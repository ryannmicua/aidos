<!--
TESTING ARTIFACT TEMPLATE

What this is:
  The Testing artifact answers: how do we verify it works and trace
  results back to requirements? It closes the artifact stack — every
  test traces backward through the Tech Design and Solution to the
  Problem's goals.

Three depths, one template:
  This template supports three levels of depth. The builder scales by
  emphasising or skipping sections based on the work. The Testing
  Rubric (T1–T9) applies at all levels — the audit is lighter at
  story scale, but the criteria still hold.

Rubric criteria:
  Core Rubric (C1–C12) — applied to every artifact. Core criteria are
  cross-cutting: you address them through the sections below.
    C1  Alignment to goals — every test traces to a requirement
    C2  Simplicity — test approach is proportionate to the risk
    C3  Explicit trade-offs — coverage gaps are justified
    C4  Failure modes — failure scenarios from upstream are tested
    C5  Testability — this artifact is the proof of testability
    C6  Observability — post-deployment verification is addressed
    C7  Security — security-relevant scenarios are tested
    C8  Reversibility — test cleanup and data rollback

  Test Strategy (epic level):
    The overall testing approach for a large initiative. Emphasise
    Coverage Map, Environment Requirements, Priority and Risk, and
    Exit Criteria. Test Scenarios stay high-level — describe what
    will be tested and at what level (unit, integration, e2e), not
    individual test cases. Detailed scenarios live in Feature-level
    test plans.

  Test Plan (feature level):
    The primary testing document. Full depth across all sections.
    Test Scenarios have specific steps and expected results. Coverage
    Map links every requirement to test cases. Test Data and
    Regression Scope are thorough. This is where most testing work
    happens.

  Acceptance Criteria (story level):
    What "done" looks like for a small piece of work. Focus on
    Coverage Map (brief — which requirements are verified) and
    Test Scenarios (specific test cases with expected results).
    Other sections can be one line or skipped if inherited from
    the parent Feature test plan. Keep it lean — if it needs more,
    the work has outgrown story scale.

Rubric criteria:
  Core Rubric (C1–C12) — applied to every artifact. Core criteria are
  cross-cutting: you address them through the sections below.
    C1  Alignment to goals — every test traces to a requirement
    C2  Simplicity — test approach is proportionate to the risk
    C3  Explicit trade-offs — coverage gaps are justified
    C4  Failure modes — failure scenarios from upstream are tested
    C5  Testability — this artifact is the proof of testability
    C6  Observability — post-deployment verification is addressed
    C7  Security — security-relevant scenarios are tested
    C8  Reversibility — test cleanup and data rollback
    C9  Future team readiness — tests are understandable and maintainable
    C10 Internal consistency — consistent structure and terminology
    C11 No duplication — reference requirements, don't restate them
    C12 Single unit of work — testing scope matches one deliverable

  Testing Rubric (T1–T9) — discipline-specific criteria:
    T1  Coverage → Coverage Map
    T2  Traceability → Coverage Map (requirement ↔ test mapping)
    T3  Scenario completeness → Test Scenarios
    T4  Exit criteria → Exit Criteria
    T5  Expected results defined → Test Scenarios (expected outcome)
    T6  Test data and preconditions → Test Data and Preconditions
    T7  Environment requirements → Environment Requirements
    T8  Regression awareness → Regression Scope
    T9  Risk-based prioritisation → Priority and Risk

Coherence check:
  The Testing artifact is audited against the Tech Design and the
  Solution. Every test case traces to a requirement in the Solution
  or a technical scenario in the Tech Design. No requirement exists
  without a corresponding test. No test exists without a corresponding
  requirement or design constraint. Deliberate gaps are stated and
  justified.
-->

# Testing: [title]

**Status:** DRAFT | REVIEW | ACCEPTED
**AIDOS Version:** 1.0.0
**Tech Design:** [link to Tech Design artifact]
**Solution:** [link to Solution artifact]

---

## Coverage Map
<!-- T1: Coverage. Every requirement and component has test coverage.
     T2: Traceability. Explicit mapping between requirements and tests.
     At strategy level: map requirement areas to test levels (unit,
     integration, e2e). At plan level: map to specific test cases.
     At story level: brief list of what's verified. -->

| Requirement / Component | Source | Test Case(s) | Coverage Gap? |
|---|---|---|---|
| [Goal from Solution] | Solution G1 | TC1, TC2 | |
| [Component from Tech Design] | Tech Design | TC3 | |
| [Integration point] | Tech Design A2 | TC4 | |

## Test Scenarios
<!-- T3: Scenario completeness. Happy path, edge cases, error conditions,
     boundary values.
     T5: Expected results defined. Every test has a specific expected outcome.
     At strategy level: describe categories of scenarios and test levels,
     not individual cases. At plan level: full detail. At story level:
     specific cases with expected results, lean format. -->

### [Scenario group name]

| # | Scenario | Preconditions | Steps | Expected Result | Priority |
|---|---|---|---|---|---|
| TC1 | | | | | Must-pass / Should-pass |
| TC2 | | | | | |

### Error and Failure Scenarios

| # | Scenario | Trigger | Expected Behaviour | Priority |
|---|---|---|---|---|
| TC-E1 | | | | |

## Test Data and Preconditions
<!-- T6: Test data and preconditions. What data is needed, where it
     comes from, how it's set up and torn down.
     At strategy level: data strategy and sourcing approach.
     At plan level: specific data sets. At story level: skip if
     inherited from parent, or one line. -->

| Data Set | Description | Source | Setup | Teardown |
|---|---|---|---|---|
| | | | | |

## Environment Requirements
<!-- T7: Environment requirements. What environments and infrastructure
     are needed to execute the test plan.
     At strategy level: environment strategy, shared infrastructure,
     tool selection. At plan level: specific environments for this
     feature. At story level: skip if inherited. -->

| Environment | Purpose | Dependencies | Available? |
|---|---|---|---|
| | | | |

## Regression Scope
<!-- T8: Regression awareness. What existing functionality could break.
     Proportionate to the blast radius of the change.
     At strategy level: regression approach for the initiative.
     At plan level: specific areas and tests. At story level: note
     what might break, or skip if the parent plan covers it. -->

| Area | Risk | Regression Tests |
|---|---|---|
| | | |

## Priority and Risk
<!-- T9: Risk-based prioritisation. Must-pass vs should-pass.
     When time is short, the team knows what to run first.
     Relevant at all levels — the granularity changes but the
     distinction between blocking and non-blocking always matters. -->

**Must-pass (blocking release):**
- [Test cases or test areas that must pass before deployment]

**Should-pass (important, not blocking):**
- [Test cases or test areas that should pass but can be accepted with known risk]

## Exit Criteria
<!-- T4: Exit criteria. Specific, measurable conditions for "done."
     Beyond "all tests pass."
     At strategy level: entry and exit criteria for the initiative.
     At plan level: conditions for this feature to be considered
     verified. At story level: what done looks like. -->

- [ ] [Coverage condition — e.g., all must-pass scenarios executed and passing]
- [ ] [Traceability condition — e.g., every Solution goal has at least one passing test]
- [ ] [Regression condition — e.g., no regressions in identified areas]
- [ ] [Environment condition — e.g., tested in staging with production-like data]

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
