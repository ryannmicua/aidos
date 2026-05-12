# Core Rubric

Universal quality criteria applied to every AIDOS artifact, at every scale.

---

## Criteria

| # | Criterion | What "Pass" Looks Like |
|---|---|---|
| C1 | Alignment to goals | Every element in the artifact traces to a stated goal or requirement. Nothing is included that doesn't serve a declared purpose. If you can't point to the goal an element serves, it shouldn't be there. |
| C2 | Simplicity | The artifact uses the simplest approach that meets the requirements. Where complexity exists, it is justified — not assumed, inherited, or left over from a previous iteration. |
| C3 | Explicit trade-offs | Trade-offs are named, not hidden. Where a choice was made between alternatives, the options considered, the decision taken, and the reasoning behind it are documented. The reader doesn't have to guess what was sacrificed or why. |
| C4 | Failure modes | The artifact identifies what can go wrong and how those failures are detected or handled. Silence on failure is itself a failure. Each significant component or workflow has its failure path addressed. |
| C5 | Testability | Every claim, requirement, or design choice in the artifact can be verified by a specific action. If you can't describe how you'd test it, you can't audit it. Vague assertions like "the system will be reliable" fail. |
| C6 | Observability | The artifact describes how you would know — in practice, after deployment — whether the thing it describes is working or not. Monitoring, alerting, logging, or health indicators are addressed where relevant. |
| C7 | Security | Security implications are considered and addressed proportionate to the risk. Data handling, access control, attack surface, and regulatory requirements are explicit where relevant. "Not applicable" is stated and justified, not assumed by omission. |
| C8 | Reversibility | The artifact states what can be undone and what can't. Where choices are irreversible — data migrations, public API contracts, third-party commitments — that irreversibility is acknowledged and the decision is justified with appropriate weight. |
| C9 | Future team readiness | Someone unfamiliar with this work could pick up the artifact and understand what was done, why, and what's left. No tribal knowledge required. Context that exists only in someone's head or in a Slack thread is not captured. |
| C10 | Internal consistency | The artifact is internally consistent. Terminology is used the same way throughout, sections don't contradict each other, and the document reads as one coherent unit rather than fragments assembled from different sessions. |
| C11 | No duplication | The artifact doesn't restate what's already captured in another artifact or in a preceding section. It references rather than copies. Each fact lives in one place. If the same statement appears twice, one of them is wrong or will be soon. |
| C12 | Single unit of work | The artifact addresses a single deliverable that can be independently understood, built, tested, and released. If it can't, it needs decomposing into sibling artifacts at the same scale level. An artifact that tries to cover too many concerns is a sign that the work hasn't been broken down enough. |

## Assessment

The auditor assesses each criterion as **Pass**, **Partial**, or **Fail** with cited evidence from the artifact. The evidence requirement is what gives the rubric teeth — you can't hand-wave a Pass. Partials are accepted or rejected by the human directing the audit, not waved through.

## When to Use

The Core Rubric is used on **every artifact** at **every scale** — Epic, Feature, and Story. It is always applied alongside the relevant Discipline Rubric for the artifact type.

| Artifact | Core Rubric | Discipline Rubric |
|---|---|---|
| Problem | Core | Problem |
| Solution | Core | Solution |
| Tech Design | Core | Tech Design |
| Testing | Core | Testing |
| Definition | Core | Definition |

At Story scale, assessment can be lighter — but the criteria still apply. A Story that ignores failure modes or hides trade-offs fails the same way an Epic does, just with smaller blast radius.
