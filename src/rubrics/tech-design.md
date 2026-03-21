# Tech Design Rubric

Discipline-specific criteria for assessing Tech Design artifacts through the **Architecture lens**.

---

## Criteria

| # | Criterion | What "Pass" Looks Like |
|---|---|---|
| A1 | Component clarity | Every component is named, its responsibility is stated, and its boundaries are defined. A developer (or coding agent) can identify what to build without ambiguity. |
| A2 | Integration points | All interfaces between components, and between this system and external systems, are explicit. Protocols, data formats, error handling at boundaries, and rate/capacity considerations are documented. |
| A3 | Data model | Data structures, storage, and flow are defined. What's persisted, what's transient, what's cached. Schema changes and migration paths are addressed where relevant. |
| A4 | Coding agent readiness | The Tech Design is usable as a brief for an AI coding agent. Constraints, acceptance criteria, error handling expectations, and implementation boundaries are explicit enough that an agent can implement without needing to ask clarifying questions. |

## Assessment

The auditor assesses each criterion as **Pass**, **Partial**, or **Fail** with cited evidence from the artifact.

- **Pass** — the criterion is fully met with clear evidence.
- **Partial** — the criterion is partly met or the evidence is weak. The human directing the audit decides whether to accept or send back.
- **Fail** — the criterion is not met. This is classified as a Bug and must be fixed before the artifact advances.

## When to Use

Apply the Tech Design Rubric when auditing:

- **Tech Design artifacts** at Epic, Feature, or Story scale
- **Combined documents** where the Tech Design section is included (e.g., a Feature-scale document with Problem, Solution, Tech Design, and Testing sections)

The Tech Design Rubric is always used **alongside the Core Rubric**. The Core Rubric covers universal quality (alignment, simplicity, trade-offs, etc.). The Tech Design Rubric covers what's specific to turning a solution into an implementable design.

## Coherence Check

The Tech Design is audited against the **Solution artifact** that precedes it. The auditor verifies that the design implements the solution — every component and decision in the Tech Design traces to something in the Solution, and nothing in the Solution is left unaddressed without explicit justification.
