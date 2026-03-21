# Core Rubric

Universal quality criteria applied to every AIDOS artifact, at every scale.

---

## Criteria

| # | Criterion | What "Pass" Looks Like |
|---|---|---|
| C1 | Alignment to goals | Every element in the artifact traces to a stated goal or requirement. Nothing is included that doesn't serve a declared purpose. |
| C2 | Simplicity | The artifact uses the simplest approach that meets the requirements. Complexity is justified where it exists, not assumed. |
| C3 | Explicit trade-offs | Trade-offs are named, not hidden. Where a choice was made between alternatives, the options, the decision, and the reasoning are documented. |
| C4 | Failure modes | The artifact identifies what can go wrong and how those failures are detected or handled. Silence on failure is itself a failure. |
| C5 | Testability | Every claim, requirement, or design choice in the artifact can be verified. If you can't test it, you can't audit it. |
| C6 | Observability | The artifact describes how you would know if the thing it describes is working or not working in practice. |
| C7 | Security | Security implications are considered and addressed. Data handling, access control, and attack surface are explicit where relevant. |
| C8 | Operational impact | The artifact addresses who runs this, how it's deployed, what changes for operations, and whether operational ownership is identified and accepted. |
| C9 | Reversibility | The artifact states what can be undone and what can't. Where choices are irreversible, that's acknowledged and justified. |
| C10 | Future team readiness | Someone unfamiliar with this work could pick up the artifact and understand what was done, why, and what's left. No tribal knowledge required. |
| C11 | Unit coherence | The artifact is internally consistent. Terminology is used consistently, sections don't contradict each other, and the document reads as one coherent unit. |
| C12 | No duplication | The artifact doesn't restate what's already captured in another artifact. It references rather than copies. Each fact lives in one place. |

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

At Story scale, assessment can be lighter — but the criteria still apply. A Story that ignores failure modes or hides trade-offs fails the same way an Epic does, just with smaller blast radius.
