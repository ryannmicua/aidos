# Claude Setup for AIDOS

AIDOS skills and prompts are agent-agnostic. This file covers Claude-specific
setup: connecting GitHub so Claude can read and write AIDOS artifacts, and
how to invoke the builder and auditor skills.

## Connecting GitHub

AIDOS uses GitHub as its artifact store. The **AIDOS GitHub MCP connector**
is a local MCP server that gives Claude (Desktop, AI, Code) read/write access
to `.aidos/` folders in any GitHub repo you have access to. It handles
discovery, branching, saving, and PR creation.

**Setup:** see [`src/connectors/github/README.md`](src/connectors/github/README.md)
for the full walkthrough — registering a GitHub OAuth App with Device Flow,
installing the connector, and adding it to `claude_desktop_config.json`.

Once configured, the 5 AIDOS tools (`open_workspace`, `read_artifacts`,
`save`, `diff`, `submit`) become available in any Claude Desktop session.

## Invoking the Skills

After the connector is configured, invoke either skill:

```
/aidos-builder   — scaffold and iterate on delivery artifacts
/aidos-auditor   — audit an artifact against the rubrics
```

The skill loads automatically. At session start it asks which repo to work on,
calls `open_workspace` to create or sync your `aidos/{username}` branch, and
loads existing artifacts via `read_artifacts`. From there you build or audit
in the conversation, then `save` checkpoints and `submit` opens a PR (or
direct merge, per the manifest's `write` config).

## Publishing to Confluence (optional)

If you want artifacts to publish to Confluence on every push, set up the
**Confluence connector** as a GitHub Actions workflow in your repo:
[`src/connectors/confluence/README.md`](src/connectors/confluence/README.md).

The two connectors are independent: GitHub for authoring, Confluence for
publishing. You can use either, both, or neither.
