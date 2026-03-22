# Contributing to AIDOS

AIDOS improves through grounded contributions from real delivery work. The goal is not to collect abstract best practices, but to harden the framework using lessons from real projects, real failures, and real review friction.

The rubrics preserve lineage — not just what changed, but what pain the change was designed to prevent.

---

## What's Welcome

**Rubric improvements** — new criteria, modified pass conditions, or criteria to retire. This is the highest-value contribution.

**Template improvements** — new artifact types, platform-specific formats, or refinements to existing templates.

**Worked examples** — end-to-end walkthroughs showing AIDOS applied to a real project. These make the framework adoptable without diluting the core model.

---

## Rubric Contributions

### How to Propose a Rubric Change

Open an issue first. Include:

1. **What burned you.** The project situation — what went wrong, when it was discovered, what it cost. This can be a direct experience, a near miss, a repeated friction pattern across teams, or a lesson from a public postmortem. The standard is: grounded in real delivery pain, not abstract preference.
2. **Which rubric it belongs to.** Core (universal), or a discipline rubric (Problem, Solution, Tech Design, Testing).
3. **The proposed criterion.** A short name and a clear "What Pass Looks Like" description.
4. **Why the current rubric didn't catch it.** What gap this fills.
5. **Example evidence.** What a reviewer would look for when assessing this criterion.
6. **Changelog entry.** One line: what changed and which project or pattern motivated it.

**Example:**

> **Burn:** Six weeks into a project, we discovered nobody had agreed to own the process in production. No team, no individual, no rotation. We had to pause delivery and escalate.
>
> **Rubric:** Core
>
> **Criterion:** *Operational Ownership* — A named individual or team has accepted responsibility for the outcome in production. "TBD" is not acceptance.
>
> **Gap:** C8 (Operational Impact) covers impact on existing systems but doesn't require someone to own the new thing.
>
> **Example evidence:** Auditor checks for a named owner in the artifact. If the owner field says "TBD," "to be confirmed," or is missing, it's a Fail.
>
> **Changelog:** Updated C8 Operational Impact — tightened pass condition to require a named individual or team, not just acknowledgment of impact.

### What Makes a Good Criterion

- **Testable.** Two people could independently assess Pass, Partial, or Fail and mostly agree based on the same evidence.
- **Non-redundant.** It catches something no other criterion covers.
- **Grounded.** It comes from real delivery pain — direct experience, observed patterns, or documented failures — not theoretical concern.
- **Actionable.** If it fails, the builder knows what to fix.

### Modifying an Existing Criterion

If a criterion is too vague, too strict, or missing the point — open an issue describing what you observed and propose a revised "What Pass Looks Like." Include the same structure: what burned you, why the current wording didn't work, and what evidence would distinguish Pass from Fail.

---

## Template Contributions

Templates should be lean tools for live AI sessions, not documentation for its own sake.

A good template is:

- **Minimal.** No sections that exist for ceremony. Every section earns its place.
- **Traceable.** Clearly connected to the artifact type and its rubric — a reviewer can see which rubric criteria each section supports.
- **AI-session ready.** Usable inside a builder session with an AI assistant. Structured so the AI can fill it progressively.
- **Auditable.** An auditor can assess the completed template against the rubric without guessing what goes where.
- **Non-duplicating.** Doesn't restate what belongs in a different artifact.

Include:

- The template file in markdown.
- Guidance comments (HTML comments within the template) explaining each section.
- Which rubric criteria are relevant.

---

## Worked Examples

End-to-end examples showing AIDOS applied to a real or realistic project are valuable contributions. A good example shows:

- The artifact stack (Problem → Solution → Tech Design → Testing) at any scale.
- At least one audit finding and how it was resolved.
- At least one issue or decision, showing how it was captured and tracked.

Examples don't need to be large. A single-feature walkthrough is often more useful than an epic-scale case study.

---

## What We Usually Won't Accept

- Criteria without real delivery context — if it's purely theoretical, it's not ready.
- Duplicate criteria already covered by existing rubric entries.
- Criteria too vague to audit consistently — if two reviewers can't agree on Pass, Partial, or Fail, it needs sharpening.
- Templates that add ceremony without improving clarity or traceability.
- Framework rewrites without prior discussion — changes to `src/framework.md` should start with an issue so the rationale can be discussed before wording is proposed.

---

## Process

1. **Open an issue first** for rubric changes, template proposals, and framework discussion. PRs without prior discussion may be closed.
2. **One criterion or one template per PR.** Keep contributions focused.
3. **Include a changelog entry** for any rubric change. Format: what changed, why, and what project or pattern motivated it.
4. **Worked examples** can be submitted directly as PRs to an `examples/` folder.

---

## A Note on Taste

AIDOS does not want contributions driven by taste. It wants contributions driven by pain.

The distinction matters. "I think we should check for X" is taste. "We got burned by X, here's what it cost, and here's how to catch it" is pain. The second one makes the rubrics better. The first one makes them longer.
