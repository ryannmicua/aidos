# Testing Rubric

Discipline-specific criteria for assessing Testing artifacts through the **Quality lens**.

---

## Criteria

| # | Criterion | What "Pass" Looks Like |
|---|---|---|
| T1 | Coverage | Every requirement, component, and integration point from the Tech Design has corresponding test coverage. Gaps are explicit and justified, not accidental. |
| T2 | Traceability | Every test traces back to a requirement in the Solution or a constraint in the Tech Design. No orphaned tests that verify things nobody asked for. No requirements without corresponding verification. |
| T3 | Scenario completeness | Tests cover the happy path, edge cases, error conditions, and boundary values. Failure scenarios identified in upstream artifacts have corresponding test cases. |
| T4 | Exit criteria | The artifact defines what "done" looks like — specific, measurable conditions that must be met before the work is considered verified. Pass/fail is unambiguous. |

## Assessment

The auditor assesses each criterion as **Pass**, **Partial**, or **Fail** with cited evidence from the artifact.

- **Pass** — the criterion is fully met with clear evidence.
- **Partial** — the criterion is partly met or the evidence is weak. The human directing the audit decides whether to accept or send back.
- **Fail** — the criterion is not met. This is classified as a Bug and must be fixed before the artifact advances.

## When to Use

Apply the Testing Rubric when auditing:

- **Testing artifacts** (Test Strategy at Epic scale, Test Plan at Feature scale, Acceptance Criteria at Story scale)
- **Combined documents** where the Testing section is included (e.g., a Feature-scale document with Problem, Solution, Tech Design, and Testing sections)

The Testing Rubric is always used **alongside the Core Rubric**. The Core Rubric covers universal quality (alignment, simplicity, trade-offs, etc.). The Testing Rubric covers what's specific to verifying that the implementation meets its goals.

## Coherence Check

The Testing artifact is audited against the **Tech Design** and the **Solution** that precede it. The auditor verifies that tests verify the Tech Design against the Solution's goals — the chain of traceability runs all the way back from test cases through design decisions to stated requirements.
