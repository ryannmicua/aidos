# AIDOS Framework

The operating model, rubrics, templates, and prompts that define AIDOS.

This is the **framework component** — pure markdown content that can be used directly in any AI session. No build. No install. No tooling. If you can paste text into an AI chat, you can use AIDOS.

---

## Prerequisites

- An AI agent that accepts a system prompt or persistent instructions (Claude, ChatGPT, Gemini, local LLMs with sufficient context)
- A place to store artifacts (a Git repo, a folder, a shared drive — anywhere)

Nothing else. No account, no CLI, no platform.

## Install

Nothing to install. The framework is this directory — just markdown.

If you want a local copy to work from, clone the repo:

```bash
git clone https://github.com/shobman/aidos.git
cd aidos/src
```

## Use

Pick the path that matches how you work.

**Path 1 — Use the Builder prompt directly in any AI chat**

1. Open [`prompts/builder-prompt.md`](prompts/builder-prompt.md) and copy the whole file
2. Paste it as the system prompt (or first message) in a Claude / ChatGPT / Gemini session
3. Describe what you're delivering — the builder will scaffold the right document structure and start building

**Path 2 — Use the Auditor prompt for independent review**

1. Open [`prompts/auditor-prompt.md`](prompts/auditor-prompt.md) and copy the whole file
2. Paste it as the system prompt in a fresh session (different from the builder session — never the same agent)
3. Provide the artifact to audit — the auditor runs it against the rubrics with pass/partial/fail + evidence

**Path 3 — Reference the framework file directly**

Read [`framework.md`](framework.md) to understand the operating model, then run sessions however you like. You don't need the packaged prompts if you've internalised the mechanics.

## Framework structure

```
framework.md                 ← The full operating model — start here
prompts/
├── builder-prompt.md        ← Self-contained system prompt for building artifacts
└── auditor-prompt.md        ← Self-contained system prompt for auditing artifacts
rubrics/
├── core.md                  ← Universal criteria (C1–C12)
├── problem.md               ← Product lens (P1–P11)
├── solution.md              ← Analysis lens (S1–S10)
├── tech-design.md           ← Architecture lens (A1–A10)
├── testing.md               ← Quality lens (T1–T9)
└── definition.md            ← Maintenance lens (F1–F7)
templates/
├── problem.md               ← Problem artifact template
├── solution.md              ← Solution artifact template
├── tech-design.md           ← Tech Design artifact template
├── testing.md               ← Testing artifact template
├── definition.md            ← Definition artifact template
├── issues-log.md            ← Centralised escalation register
├── overflow-log.md          ← Captures ideas that don't belong in the current artifact
├── meeting-minutes.md       ← Lean meeting capture
└── retrospective.md         ← Rubric evolution mechanism
connectors/                  ← See src/connectors/*/README.md
```

## Develop

The framework is the content users depend on. Changes here propagate to the built skills (see [`../skills/README.md`](../skills/README.md)) and to the Framework Explorer site.

**To add or modify a rubric criterion**, edit the relevant file in `rubrics/`. Changes flow into the next skill build automatically.

**To add or modify a template**, edit the relevant file in `templates/`. The builder skill uses these as scaffolds during artifact creation.

**To modify the prompts**, edit `prompts/builder-prompt.md` or `prompts/auditor-prompt.md`. The build script (`../skills/build.ps1`) rewrites relative paths inside these files so they work inside the packaged skill ZIPs — don't break the path patterns (`src/rubrics/`, `src/templates/`, `src/framework.md`).

**Retrospective-driven evolution.** Rubric changes should be grounded in real delivery experience — see [`../CONTRIBUTING.md`](../CONTRIBUTING.md) for the contribution model. "We got burned by X" is the most valuable kind of rubric contribution.

**Local verification.** There is no test suite for the framework itself — it's content, not code. Review changes by reading them in context, then rebuild the skills (`../skills/build.ps1`) and test the skill locally to confirm the packaging still works.
