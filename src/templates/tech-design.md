<!--
TECH DESIGN ARTIFACT TEMPLATE

What this is:
  The Tech Design artifact answers: how will the solution be implemented?
  Components, interfaces, data, constraints — explicit enough that a
  developer or AI coding agent can build from this document without
  re-explaining context.

Rubric criteria:
  Core Rubric (C1–C13) — applied to every artifact. Core criteria are
  cross-cutting: you address them through the sections below. In particular:
    C1  Alignment to goals — every component traces to the Solution
    C2  Simplicity — simplest design that implements the solution
    C3  Explicit trade-offs — architectural choices documented
    C4  Failure modes — each component's failure path addressed
    C5  Testability — every design choice is verifiable
    C6  Observability — monitoring, logging, health indicators
    C7  Security — access control, data handling, attack surface
    C8  Operational impact — deployment burden, ownership
    C9  Reversibility — what's irreversible (migrations, APIs)
    C10 Future team readiness — a new developer can follow this
    C11 Internal consistency — consistent naming and terminology
    C12 No duplication — reference the Solution, don't restate it
    C13 Single unit of work — one implementable unit

  Tech Design Rubric (A1–A10) — discipline-specific criteria:
    A1  Component clarity → Components
    A2  Integration points → Integration Points
    A3  Data model → Data Model
    A4  Error handling strategy → Error Handling
    A5  Technology choices justified → Technology Choices
    A6  Performance and capacity → Performance and Capacity
    A7  Deployment and environment → Deployment and Environment
    A8  Migration path → Migration Path
    A9  Constraints and boundaries → Constraints and Boundaries
    A10 Coding agent readiness → Coding Agent Brief

Coherence check:
  The Tech Design is audited against the Solution artifact. Every
  component traces to something in the Solution. Nothing in the
  Solution is left unaddressed without explicit justification.

Scaling depth:
  Epic — architecture-level. Component boundaries, integration contracts,
  technology decisions. Implementation detail lives in Feature designs.
  Feature — the primary implementation brief. This is what the coding
  agent receives. Go deep.
  Story — focus on Technical Approach and Coding Agent Brief.
-->

# Tech Design: [title]

**Status:** DRAFT | REVIEW | ACCEPTED
**Solution:** [link to Solution artifact]

---

## Components
<!-- A1: Component clarity. Name each component, state its responsibility,
     define its boundaries. No overlapping responsibilities, no gaps. -->

| Component | Responsibility | Boundary |
|---|---|---|
| | | |

### [Component name]

[Detailed description. What it does, what it owns, what it doesn't.
Internal structure if relevant.]

## Integration Points
<!-- A2: Integration points. All interfaces — internal and external.
     Protocols, data formats, auth, error handling, rate limits. -->

| Interface | From → To | Protocol | Auth | Data Format |
|---|---|---|---|---|
| | | | | |

[For each non-trivial integration, describe the contract: request/response
format, error codes, timeout behaviour, retry policy.]

## Data Model
<!-- A3: Data model. What's persisted, transient, cached, derived.
     Schema changes, migration paths, data lifecycle. -->

### Entities

| Entity | Storage | Lifecycle | Notes |
|---|---|---|---|
| | | | |

### Schema Changes

[New tables, modified columns, migration approach. If no schema changes,
state that explicitly.]

## Error Handling
<!-- A4: Error handling strategy. What's caught, propagated, retried,
     surfaced. Error categories. What happens when things don't work. -->

| Layer | Error Category | Handling | Surfaced To |
|---|---|---|---|
| | | | |

## Technology Choices
<!-- A5: Technology choices justified. State each choice with rationale.
     Fit, not habit. -->

| Choice | Rationale | Alternatives Rejected |
|---|---|---|
| | | |

## Performance and Capacity
<!-- A6: Performance and capacity. Expected load, response time targets,
     data volumes, resource limits, scaling approach. -->

| Metric | Target | Current Baseline | Breaking Point |
|---|---|---|---|
| | | | |

## Deployment and Environment
<!-- A7: Deployment and environment. How it's deployed, infrastructure
     dependencies, configuration, secrets, environment-specific behaviour. -->

[Deployment process. Environments required. Configuration management.
Secrets handling. What differs between environments.]

## Migration Path
<!-- A8: Migration path. Current state to target state without breaking
     existing functionality. Feature flags, backward compatibility, rollback. -->

[How to get from here to there. Rollback procedure if deployment fails.
Backward compatibility window. Data migration steps if applicable.]

## Constraints and Boundaries
<!-- A9: Constraints and boundaries. Hard limits on what the implementation
     must not do. Guardrails for the implementer. -->

- [Must not: security boundary, data access restriction, API limitation,
  performance budget]

## Coding Agent Brief
<!-- A10: Coding agent readiness. Everything an AI coding agent needs
     to implement without asking clarifying questions. -->

**Acceptance criteria:**
- [Specific, testable conditions that define "done"]

**File and module structure:**
- [Where new code goes, naming conventions, module boundaries]

**Implementation boundaries:**
- [What the agent should and should not change]

**Naming conventions:**
- [Variable, function, file naming patterns to follow]

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
