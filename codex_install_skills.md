# Codex: Install AIDOS Skills

Instructions for agents to add the AIDOS Builder and Auditor skills to a project's `.agents/skills/` folder.

---

## What you are installing

Two skills ship from the AIDOS framework:

| Skill | Invocation | Purpose |
|---|---|---|
| **AIDOS Builder** | `/aidos-builder` | Scaffold and iterate on delivery artifacts (Problem, Solution, Tech Design, Testing, Definition) |
| **AIDOS Auditor** | `/aidos-auditor` | Audit artifacts against Core and discipline-specific rubrics |

Each skill is a self-contained directory of markdown files. Installing them into `.agents/skills/` makes them available as slash-commands in any Codex session opened against the project.

---

## Prerequisites

- Write access to the target project repository
- Ability to download files from `https://shobman.github.io/aidos/skills/` and extract ZIP archives

---

## Install steps

### 1. Download the prebuilt ZIPs

Download both ZIPs from the AIDOS Framework Explorer site:

- `https://shobman.github.io/aidos/skills/aidos-builder.zip`
- `https://shobman.github.io/aidos/skills/aidos-auditor.zip`

### 2. Create the skills directory

Create the `.agents/skills/` directory at the project root if it does not already exist:

```
.agents/
└── skills/
```

### 3. Extract each ZIP into the skills directory

Extract the contents of each ZIP so that the skill name becomes a subdirectory under `.agents/skills/`:

```
.agents/
└── skills/
    ├── aidos-builder/
    │   ├── SKILL.md
    │   ├── builder-prompt.md
    │   ├── framework.md
    │   ├── rubrics/
    │   │   ├── core.md
    │   │   └── definition.md
    │   ├── templates/
    │   │   ├── problem.md
    │   │   ├── solution.md
    │   │   ├── tech-design.md
    │   │   ├── testing.md
    │   │   ├── definition.md
    │   │   ├── issues-log.md
    │   │   ├── overflow-log.md
    │   │   ├── meeting-minutes.md
    │   │   └── retrospective.md
    │   ├── migrations/
    │   ├── CONTRIBUTING.md
    │   └── VERSION
    └── aidos-auditor/
        ├── SKILL.md
        ├── auditor-prompt.md
        ├── framework.md
        ├── rubrics/
        │   ├── core.md
        │   ├── problem.md
        │   ├── solution.md
        │   ├── tech-design.md
        │   ├── testing.md
        │   └── definition.md
        ├── templates/
        │   └── retrospective.md
        ├── CONTRIBUTING.md
        └── VERSION
```

Each ZIP is already structured with the skill name as its root directory (e.g. `aidos-builder/SKILL.md`). Extract directly into `.agents/skills/` — do not rename or flatten the structure.

### 4. Commit the skills to the repository

Add and commit the extracted skill directories so that any agent opening the project has access to them:

```bash
git add .agents/skills/
git commit -m "Add AIDOS Builder and Auditor skills"
```

---

## Verify the install

After extracting, confirm the following files exist:

- `.agents/skills/aidos-builder/SKILL.md`
- `.agents/skills/aidos-auditor/SKILL.md`

Both `SKILL.md` files are the entry points the agent loads first. If either is missing, the corresponding skill will not be available.

---

## Use

Once installed, invoke the skills in an agent session:

```
/aidos-builder   — scaffold and iterate on delivery artifacts
/aidos-auditor   — audit an artifact against the rubrics
```

The skills detect their environment automatically:

- **With direct filesystem access:** the skills read and write `.aidos/` files in the project root.
- **Without filesystem access:** the skills work with content pasted into the session and render artifacts inline.

---

## Optional: add project-level hints

To make the agent automatically reach for the right skill on AIDOS-related work, add a short instruction to your project's agent instructions file (e.g. `AGENTS.md` or `.agents/instructions.md`):

```markdown
For any Problem, Solution, Tech Design, or Testing artifact work, use the
/aidos-builder skill. For reviewing artifacts, use /aidos-auditor in a
separate session.
```

---

## Updating the skills

The published ZIPs are rebuilt on every push to `main` in the AIDOS repository and reflect the latest framework version. To update:

1. Download the latest ZIPs from the URLs above.
2. Delete the existing `.agents/skills/aidos-builder/` and `.agents/skills/aidos-auditor/` directories.
3. Re-extract the new ZIPs into `.agents/skills/`.
4. Commit the updated directories.

The `VERSION` file inside each skill directory records the framework semver — check it to confirm which version is installed.

---

## Source

Skills are built from [`ryannmicua/aidos`](https://github.com/ryannmicua/aidos). See [`skills/README.md`](skills/README.md) for details on building from source or modifying skill behaviour.
