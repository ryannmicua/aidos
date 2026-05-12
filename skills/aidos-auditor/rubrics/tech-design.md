# Tech Design Rubric

Discipline-specific criteria for assessing Tech Design artifacts through the **Architecture lens**. This rubric checks whether the design is implementable — by a developer or an AI coding agent — without ambiguity, hidden assumptions, or unstated constraints.

---

## Criteria

| # | Criterion | What "Pass" Looks Like |
|---|---|---|
| A1 | Component clarity | Every component is named, its responsibility is stated, and its boundaries are defined. A developer or coding agent can identify what to build without ambiguity. Responsibilities don't overlap between components, and no behaviour falls between the cracks. |
| A2 | Integration points | All interfaces between components, and between this system and external systems, are explicit. Protocols, data formats, authentication, error handling at boundaries, and rate or capacity considerations are documented. Nothing connects to an undescribed endpoint. |
| A3 | Data model | Data structures, storage, and flow are defined. What's persisted, what's transient, what's cached, and what's derived. Schema changes, migration paths, and data lifecycle (creation, update, archival, deletion) are addressed where relevant. |
| A4 | Error handling strategy | The approach to errors is explicit at each layer — what's caught, what's propagated, what's retried, and what's surfaced to the user or operator. Error categories are defined. The design doesn't assume everything works; it states what happens when things don't. |
| A5 | Technology choices justified | Technology, framework, and library selections are stated with rationale. Choices are made for fit, not habit. Where the team's default stack is used, that's a valid reason — but it's stated, not assumed. Where an unusual choice is made, the trade-off is documented. |
| A6 | Performance and capacity | Expected load, response time targets, data volumes, and resource limits are stated. Where the design must scale, the scaling approach is described. Where it doesn't need to scale, that assumption is explicit with the threshold at which it breaks. |
| A7 | Deployment and environment | How the system is deployed, what environments it requires, and what infrastructure dependencies it has are documented. Configuration management, secrets handling, and environment-specific behaviour are addressed. The gap between "works on my machine" and "works in production" is closed. |
| A8 | Migration path | How the system gets from the current state to the target state without breaking existing functionality. Data migration, feature flags, backward compatibility windows, and rollback procedures are addressed where relevant. The design doesn't assume a greenfield. |
| A9 | Constraints and boundaries | Hard limits on what the implementation must not do — security boundaries, data it must not access, APIs it must not call, performance budgets it must not exceed — are explicit. These are the guardrails for whoever implements, whether human or AI agent. |
| A10 | Coding agent readiness | The Tech Design is usable as a brief for an AI coding agent. Acceptance criteria, error handling expectations, implementation boundaries, naming conventions, and file/module structure are explicit enough that an agent can implement without needing to ask clarifying questions or infer context from tribal knowledge. |

## Assessment

The auditor assesses each criterion as **Pass**, **Partial**, or **Fail** with cited evidence from the artifact.

- **Pass** — the criterion is fully met with clear evidence.
- **Partial** — the criterion is partly met or the evidence is weak. The human directing the audit decides whether to accept or send back.
- **Fail** — the criterion is not met. This is classified as a Bug and must be fixed before the artifact advances.

## When to Use

Apply the Tech Design Rubric when auditing:

- **Tech Design artifacts** at Epic, Feature, or Story scale
- **Combined documents** where the Tech Design section is included (e.g., a Feature-scale combined document covering Problem, Solution, and Tech Design, plus a separate Test Plan)

The Tech Design Rubric is always used **alongside the Core Rubric**. The Core Rubric covers universal quality (alignment, simplicity, trade-offs, etc.). The Tech Design Rubric covers what's specific to turning a solution into an implementable design.

## Coherence Check

The Tech Design is audited against the **Solution artifact** that precedes it. The auditor verifies that the design implements the solution — every component and decision in the Tech Design traces to something in the Solution, and nothing in the Solution is left unaddressed without explicit justification.
