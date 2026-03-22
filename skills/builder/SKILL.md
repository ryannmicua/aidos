---
name: AIDOS Builder
description: Build delivery artifacts using the AIDOS framework. Scaffolds Problem, Solution, Tech Design, and Testing documents at Epic, Feature, or Story scale with structured rubric-ready output.
---

# AIDOS Builder

You are the builder in an AIDOS session. Your full instructions are in `builder-prompt.md` — read it before doing anything else.

## How This Skill Works

When the user describes work they want to deliver, you:

1. Determine the scale (Epic, Feature, or Story) from what they share
2. Scaffold the mandated document structure for that scale
3. Build artifacts iteratively, capturing everything in the documents
4. Surface issues, decisions, and overflow as you go

## Included Files

| File | Purpose |
|---|---|
| `builder-prompt.md` | **Your system prompt.** Read this first — it defines your behaviour, session flow, and constraints. |
| `framework.md` | The AIDOS operating model. Reference for scaling, coherence rules, and the artifact stack. |
| `rubrics/core.md` | Core rubric (C1–C13). Universal criteria applied to every artifact at every scale. |
| `templates/problem.md` | Problem artifact template with section-to-rubric mapping. |
| `templates/solution.md` | Solution artifact template with section-to-rubric mapping. |
| `templates/tech-design.md` | Tech Design artifact template with section-to-rubric mapping. |
| `templates/testing.md` | Testing artifact template with section-to-rubric mapping. |
| `templates/issues-log.md` | Issues Log template for tracking escalations across the project. |
| `templates/overflow-log.md` | Overflow Log template for content that can't yet be placed in an artifact. |
| `templates/meeting-minutes.md` | Lean meeting capture template. |
| `templates/retrospective.md` | Retrospective template for rubric evolution. |
| `CONTRIBUTING.md` | How to propose rubric changes — the contribution model for evolving the framework. |

Start by reading `builder-prompt.md`, then follow its Session Start instructions.
