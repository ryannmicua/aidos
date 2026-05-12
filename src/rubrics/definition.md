# Definition Rubric

Discipline-specific criteria for assessing Definition artifacts through the **Maintenance lens**. This rubric checks whether the Definition is a useful, accurate, and self-contained description of a feature as it exists today — not a summary of the project that built it.

The Definition is created at project closure in a deliberate distillation session — the final act of the project. It is the only AIDOS artifact maintained post-delivery. Delivery artifacts (Problem, Solution, Tech Design, Testing) answer "how did we get here?" The Definition answers "what is this, and why does it work this way?" Its audience is someone who was never in the room — a maintainer, an on-call engineer, a future team, or an AI agent picking up work on this feature months later.

Where Definition criteria overlap in theme with Core criteria, the distinction is audience and timing. C9 (Future team readiness) checks that a delivery artifact is comprehensible during the build. F3 (Maintainer orientation) checks that the Definition is useful to someone who will never read the delivery artifacts. F5 (Operational context) captures operational reality for the person actually running the system; operational concerns at design time are covered by Tech Design's A7 (Deployment and environment).

---

## Criteria

| # | Criterion | What "Pass" Looks Like |
|---|---|---|
| F1 | Outcome accuracy | The Definition describes what was actually built and deployed, not what was originally planned. Where the implementation diverged from the design — and it usually does — the divergence and its reason are stated. A reader comparing the Definition to the running system would find no significant discrepancies. |
| F2 | Key trade-offs preserved | The most significant trade-offs and decisions from the delivery are captured with enough context that a future reader understands why things are the way they are. Not every decision — the ones that shaped the system's current behaviour. If the team chose caching over real-time, or accepted a dependency with known reliability issues, that's here with the reasoning. |
| F3 | Maintainer orientation | The Definition is self-contained and answers the questions a maintainer would ask: what does this do, why was it built this way, what are the known limitations, and what would you need to know to change it safely. It may link to delivery artifacts for forensic detail, but a reader using only the Definition has enough context to work with the feature. No delivery-process language — no references to "Pass 2 findings" or "the audit caught this." This is for someone who was never in the room and doesn't care about the project that built it. |
| F4 | Known limitations and debt | Technical debt, accepted risks, deferred scope, and known limitations are listed explicitly. Items from the Overflow Log that were moved to BACKLOG are represented here. A future team knows what was consciously left undone and what was accepted as a known imperfection. Nothing is hidden — if you know it's a limitation, say so. |
| F5 | Operational context | Who owns this in production, how it is monitored, what the failure modes are, and what the runbook looks like (or where to find it). Enough for an on-call engineer to orient without reading the full Tech Design. If this section is empty, nobody owns this in production — and that's a Fail. |
| F6 | Domain placement | The Definition is filed in the product taxonomy — organised by domain, not by the project that created it. A reader browsing by domain can find it without knowing which project, sprint, or team built it. The relationship to other Definitions in the same domain is clear. |
| F7 | Currency | The Definition reflects the current state of the system, not the state at initial delivery. If the feature has evolved since delivery — through subsequent projects, patches, or operational changes — the Definition has been updated to match. Staleness is visible: either through version history or an explicit "Last updated" with a summary of what changed. A Definition that describes a system that no longer exists is worse than no Definition at all. |

## Assessment

The auditor assesses each criterion as **Pass**, **Partial**, or **Fail** with cited evidence from the artifact.

- **Pass** — the criterion is fully met with clear evidence.
- **Partial** — the criterion is partly met or the evidence is weak. The human directing the audit decides whether to accept or send back.
- **Fail** — the criterion is not met. This is classified as a Bug and must be fixed before the artifact advances.

## When to Use

Apply the Definition Rubric when auditing:

- **Definition artifacts** at Epic or Feature scale
- **Combined documents** where the Definition section is included (e.g., a Feature-scale combined document with an appended Definition section)

The Definition Rubric is always used **alongside the Core Rubric**. The Core Rubric covers universal quality (alignment, simplicity, trade-offs, etc.). The Definition Rubric covers what's specific to maintaining a living, authoritative description of a feature.

**Story scale exception:** Stories do not produce Definitions. They inherit from their parent Feature or Epic Definition.

## Coherence Check

The Definition is audited against the **Solution** and **Tech Design** (and the actual deployed system where observable). The auditor verifies:

- What the Definition describes matches what was actually built, not what was originally planned
- Key decisions from the delivery artifacts are represented in the Definition
- No significant trade-offs or limitations are omitted
- The Definition is independently comprehensible without the delivery artifacts

Unlike delivery artifacts, where the coherence check verifies alignment between plan and predecessor, the Definition's coherence check verifies alignment between the Definition and reality.
