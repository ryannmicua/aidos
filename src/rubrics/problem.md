# Problem Rubric

Discipline-specific criteria for assessing Problem artifacts through the **Product lens**.

---

## Criteria

| # | Criterion | What "Pass" Looks Like |
|---|---|---|
| P1 | Clarity | The problem is stated in plain language. A reader unfamiliar with the project can understand what's wrong, for whom, and why it matters — without jargon or assumed context. |
| P2 | Stakeholder identification | All affected parties are named — who experiences the problem, who owns the outcome, who needs to approve the solution, and who is impacted by change. No implicit stakeholders. |
| P3 | Goal measurability | Success criteria are specific and measurable. "Reduce lookup time to under 30 seconds" passes. "Improve the experience" does not. Each goal has a way to verify it was met. |
| P4 | Root cause confidence | The artifact distinguishes between symptoms and causes. Where the root cause is known, evidence is cited. Where it's uncertain, that uncertainty is explicit and the level of confidence is stated. |

## Assessment

The auditor assesses each criterion as **Pass**, **Partial**, or **Fail** with cited evidence from the artifact.

- **Pass** — the criterion is fully met with clear evidence.
- **Partial** — the criterion is partly met or the evidence is weak. The human directing the audit decides whether to accept or send back.
- **Fail** — the criterion is not met. This is classified as a Bug and must be fixed before the artifact advances.

## When to Use

Apply the Problem Rubric when auditing:

- **Problem artifacts** at Epic, Feature, or Story scale
- **Combined documents** where the Problem section is included (e.g., a Feature-scale document with Problem, Solution, Tech Design, and Testing sections)

The Problem Rubric is always used **alongside the Core Rubric**. The Core Rubric covers universal quality (alignment, simplicity, trade-offs, etc.). The Problem Rubric covers what's specific to defining a problem well.

## Coherence Check

The Problem artifact is the start of the artifact stack. It has no preceding artifact to check against, but the auditor should verify that the problem as stated is consistent with any parent Epic problem when auditing at Feature or Story scale.
