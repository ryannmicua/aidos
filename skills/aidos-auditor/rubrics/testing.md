# Testing Rubric

Discipline-specific criteria for assessing Testing artifacts through the **Quality lens**. This rubric checks whether the verification approach is complete, traceable, and honest — or whether it's a checklist that gives false confidence.

---

## Criteria

| # | Criterion | What "Pass" Looks Like |
|---|---|---|
| T1 | Coverage | Every requirement, component, and integration point from the Tech Design has corresponding test coverage. Gaps are explicit and justified — "we chose not to test X because Y" — not accidental omissions discovered later. |
| T2 | Traceability | Every test traces back to a requirement in the Solution or a constraint in the Tech Design. No orphaned tests that verify things nobody asked for. No requirements without corresponding verification. The mapping is explicit, not implied. |
| T3 | Scenario completeness | Tests cover the happy path, edge cases, error conditions, and boundary values. Failure scenarios identified in upstream artifacts — the Problem's risks, the Solution's edge cases, the Tech Design's error handling — have corresponding test cases. |
| T4 | Exit criteria | The artifact defines what "done" looks like — specific, measurable conditions that must be met before the work is considered verified. Pass/fail is unambiguous. "All tests pass" is necessary but not sufficient; the criteria address coverage and confidence, not just execution. |
| T5 | Expected results defined | Every test case has an explicit expected outcome. "Verify the system handles it correctly" fails. "The API returns 404 with error body { ... } and no side effects" passes. The expected result is specific enough that two testers would agree on pass or fail. |
| T6 | Test data and preconditions | The data required to execute tests is identified — what it looks like, where it comes from, and how it's set up and torn down. Preconditions for each test scenario are stated. Tests don't assume a particular system state without establishing it. |
| T7 | Environment requirements | What environments are needed to execute the test plan, and what dependencies those environments have, are stated. If tests require specific infrastructure, third-party sandboxes, or production-like data, those requirements are explicit and achievable. |
| T8 | Regression awareness | The artifact identifies what existing functionality could be affected by the change and includes tests to verify it still works. New features don't ship with blind spots on the things they might break. The scope of regression testing is proportionate to the blast radius of the change. |
| T9 | Risk-based prioritisation | Tests are prioritised by risk and impact, not listed flat. The artifact distinguishes between must-pass tests (blocking release) and should-pass tests (important but not blocking). When time is short, the team knows which tests to run first and which to defer. |

## Assessment

The auditor assesses each criterion as **Pass**, **Partial**, or **Fail** with cited evidence from the artifact.

- **Pass** — the criterion is fully met with clear evidence.
- **Partial** — the criterion is partly met or the evidence is weak. The human directing the audit decides whether to accept or send back.
- **Fail** — the criterion is not met. This is classified as a Bug and must be fixed before the artifact advances.

## When to Use

Apply the Testing Rubric when auditing:

- **Testing artifacts** (Test Strategy at Epic scale, Test Plan at Feature scale, Acceptance Criteria at Story scale)
- **Combined documents** where the Testing section is included (e.g., a Feature-scale combined document covering Problem, Solution, and Tech Design, plus a separate Test Plan)

The Testing Rubric is always used **alongside the Core Rubric**. The Core Rubric covers universal quality (alignment, simplicity, trade-offs, etc.). The Testing Rubric covers what's specific to verifying that the implementation meets its goals.

## Coherence Check

The Testing artifact is audited against the **Tech Design** and the **Solution** that precede it. The auditor verifies that every test case traces to a requirement in the Solution or a technical scenario in the Tech Design. No requirement should exist without a corresponding test. No test should exist without a corresponding requirement or design constraint. If a requirement is deliberately untested, that gap is stated and justified.
