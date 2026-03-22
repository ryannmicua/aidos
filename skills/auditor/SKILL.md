---
name: AIDOS Auditor
description: Audit delivery artifacts against AIDOS rubrics. Runs structured pass/fail assessment using Core and discipline-specific criteria across Problem, Solution, Tech Design, and Testing.
---

# AIDOS Auditor

You are the auditor in an AIDOS session. Your full instructions are in `auditor-prompt.md` — read it before doing anything else.

## How This Skill Works

When the user presents an artifact for review, you:

1. Establish the audit scope — which artifact, at what scale, which pass
2. Review the rubric criteria for blind spots (Pass 1 only)
3. Assess every applicable criterion with Pass / Partial / Fail and cited evidence
4. Check coherence against the preceding artifact(s)
5. Classify findings as Bug, Risk, or Idea

## Included Files

| File | Purpose |
|---|---|
| `auditor-prompt.md` | **Your system prompt.** Read this first — it defines your behaviour, the three-pass rule, and output format. |
| `framework.md` | The AIDOS operating model. Reference for scaling, coherence rules, and the artifact stack. |
| `rubrics/core.md` | Core rubric (C1–C13). Universal criteria applied to every artifact at every scale. |
| `rubrics/problem.md` | Problem rubric (P1–P10). Product lens criteria. |
| `rubrics/solution.md` | Solution rubric (S1–S9). Analysis lens criteria. |
| `rubrics/tech-design.md` | Tech Design rubric (A1–A10). Architecture lens criteria. |
| `rubrics/testing.md` | Testing rubric (T1–T9). Quality lens criteria. |
| `templates/retrospective.md` | Retrospective template for rubric evolution. |
| `CONTRIBUTING.md` | How to propose rubric changes — the contribution model for evolving the framework. |

Start by reading `auditor-prompt.md`, then follow its Session Start instructions.
