# Solution Rubric

Discipline-specific criteria for assessing Solution artifacts through the **Analysis lens**.

---

## Criteria

| # | Criterion | What "Pass" Looks Like |
|---|---|---|
| S1 | Conceptual coherence | The solution holds together as a system. All parts work toward the same goal, with no internal contradictions or orphaned components. A reader can see how the pieces connect. |
| S2 | Workflow completeness | Every user or system workflow is traced end to end. Entry points, decision points, handoffs, and exit points are explicit. No "and then the user does the obvious thing" gaps. |
| S3 | Edge cases | Boundary conditions, unusual inputs, and atypical scenarios are identified and addressed. The solution doesn't only describe the happy path. |
| S4 | Minimum viable slice | The artifact identifies the smallest version that delivers value. Scope is bounded — what's in, what's out, and why. The slice is viable (delivers real value), not just minimal. |

## Assessment

The auditor assesses each criterion as **Pass**, **Partial**, or **Fail** with cited evidence from the artifact.

- **Pass** — the criterion is fully met with clear evidence.
- **Partial** — the criterion is partly met or the evidence is weak. The human directing the audit decides whether to accept or send back.
- **Fail** — the criterion is not met. This is classified as a Bug and must be fixed before the artifact advances.

## When to Use

Apply the Solution Rubric when auditing:

- **Solution artifacts** at Epic, Feature, or Story scale
- **Combined documents** where the Solution section is included (e.g., a Feature-scale document with Problem, Solution, Tech Design, and Testing sections)

The Solution Rubric is always used **alongside the Core Rubric**. The Core Rubric covers universal quality (alignment, simplicity, trade-offs, etc.). The Solution Rubric covers what's specific to designing a coherent response to the problem.

## Coherence Check

The Solution is audited against the **Problem artifact** that precedes it. The auditor verifies that the solution visibly solves the stated problem — every goal in the Problem has a corresponding response in the Solution, and nothing in the Solution addresses a problem that wasn't stated.
