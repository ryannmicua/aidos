# Solution Rubric

Discipline-specific criteria for assessing Solution artifacts through the **Analysis lens**. This rubric checks whether the proposed response works as a coherent system — or whether it's a collection of ideas that haven't been thought through together.

---

## Criteria

| # | Criterion | What "Pass" Looks Like |
|---|---|---|
| S1 | Conceptual coherence | The solution holds together as a system. All parts work toward the same goal, with no internal contradictions or orphaned components. A reader can trace how the pieces connect and why each piece exists. |
| S2 | Workflow completeness | Every user or system workflow is traced end to end. Entry points, decision points, handoffs, and exit points are explicit. No "and then the user does the obvious thing" gaps. The solution accounts for what happens at each step, not just the first and last. |
| S3 | Edge cases | Boundary conditions, unusual inputs, and atypical scenarios are identified and addressed — or explicitly deferred with rationale. The solution doesn't only describe the happy path. Where an edge case is out of scope, that's a deliberate statement, not an omission. |
| S4 | Minimum viable slice | The artifact identifies the smallest version that delivers real value. Scope is bounded — what's in, what's out, and why. The slice is viable (solves the stated problem at reduced scope), not just minimal (ships something small that doesn't actually help). |
| S5 | Alternatives considered | At least one alternative approach was evaluated and the reasoning for rejection is documented. The chosen solution isn't the default because it was the first idea — it's the choice because it's the best fit. "We considered doing nothing" counts if genuinely evaluated. |
| S6 | Dependency identification | External systems, teams, services, data sources, and decisions that the solution depends on are named. For each dependency, the current status is stated: available, committed, assumed, or at risk. Hidden dependencies are the ones that derail delivery. |
| S7 | Migration and transition | The path from the current state to the proposed solution is described. If users, data, or processes need to move, the transition approach is explicit. Cutover strategy, backward compatibility, and rollback are addressed where relevant. The solution doesn't assume a clean start. |
| S8 | Actor identification | Every person, team, system, or role that interacts with the solution is identified with their specific interactions described. The artifact is clear about who does what — not just what the system does. Where human action is required, frequency and skill expectations are stated. |
| S9 | Constraint compliance | The solution demonstrably respects the constraints identified in the Problem artifact — regulatory, technical, organisational, budget, and timeline. Where a constraint can't be fully met, the gap is acknowledged and the mitigation or trade-off is explicit. |

## Assessment

The auditor assesses each criterion as **Pass**, **Partial**, or **Fail** with cited evidence from the artifact.

- **Pass** — the criterion is fully met with clear evidence.
- **Partial** — the criterion is partly met or the evidence is weak. The human directing the audit decides whether to accept or send back.
- **Fail** — the criterion is not met. This is classified as a Bug and must be fixed before the artifact advances.

## When to Use

Apply the Solution Rubric when auditing:

- **Solution artifacts** at Epic, Feature, or Story scale
- **Combined documents** where the Solution section is included (e.g., a Feature-scale combined document covering Problem, Solution, and Tech Design, plus a separate Test Plan)

The Solution Rubric is always used **alongside the Core Rubric**. The Core Rubric covers universal quality (alignment, simplicity, trade-offs, etc.). The Solution Rubric covers what's specific to designing a coherent response to the problem.

## Coherence Check

The Solution is audited against the **Problem artifact** that precedes it. The auditor verifies that the solution visibly solves the stated problem — every goal in the Problem has a corresponding response in the Solution, and nothing in the Solution addresses a problem that wasn't stated.
