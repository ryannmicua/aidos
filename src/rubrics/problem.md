# Problem Rubric

Discipline-specific criteria for assessing Problem artifacts through the **Product lens**. This rubric checks whether the problem is defined well enough to solve — or whether the team is about to build a solution to the wrong question.

---

## Criteria

| # | Criterion | What "Pass" Looks Like |
|---|---|---|
| P1 | Clarity | The problem is stated in plain language. A reader unfamiliar with the project can understand what's wrong, for whom, and why it matters — without jargon, acronyms, or assumed context. If a term requires domain knowledge, it's defined. |
| P2 | Stakeholder identification | All affected parties are named — who experiences the problem, who owns the outcome, who needs to approve the solution, who is impacted by change, and who can block progress. No implicit stakeholders. Absence of a stakeholder is stated and justified, not an oversight. |
| P3 | Goal measurability | Success criteria are specific and measurable. "Reduce lookup time to under 30 seconds" passes. "Improve the experience" does not. Each goal has a defined method of verification. The difference between full success and partial success is clear. |
| P4 | Root cause confidence | The artifact distinguishes between symptoms and causes. Where the root cause is known, evidence is cited. Where it's uncertain, that uncertainty is explicit and the level of confidence is stated. The artifact doesn't present a guess as a fact. |
| P5 | Scope justification | Everything in scope traces to a stated need or goal. Nothing has crept in without justification. The boundary between "must solve" and "nice to have" is explicit. Items added to scope after initial framing are flagged with rationale. |
| P6 | Non-goals | What the artifact explicitly will not address is stated and justified. Non-goals prevent scope creep and set expectations. If a related problem is deliberately excluded, the reader understands why without having to ask. |
| P7 | Assumptions surfaced | Assumptions are listed, not buried in prose or left implicit. Each assumption identifies what would change if it turned out to be wrong. Critical assumptions — those that would invalidate the problem framing if false — are flagged for validation. |
| P8 | Constraints identified | Regulatory, technical, organisational, timeline, and budget constraints that bound the solution space are explicit. The artifact doesn't leave the Solution author to discover constraints that were known during problem framing. |
| P9 | Impact and urgency | The cost or impact of the problem is quantified where possible — time lost, revenue at risk, users affected, manual effort consumed. Urgency is stated: why now, and what happens if this isn't addressed. The case for action is evidence-based, not assertion-based. |
| P10 | Existing alternatives considered | The artifact acknowledges whether this problem is already solved — by a vendor product, an internal tool, a manual workaround, or a competing initiative. If alternatives exist, the reason they're insufficient is stated. Building is not the default; it's justified. |

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
