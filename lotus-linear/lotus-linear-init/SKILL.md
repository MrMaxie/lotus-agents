---
name: lotus-linear-init
description: Initialize the Linear-backed Lotus workflow in a repository. Use when Codex needs to seed `.local/AGENTS.md` and `.docs/AGENTS.md` for a workflow where Linear is the canonical operational store and local files hold only private configuration and durable project guidance rules.
---

# Lotus Linear Init

Use this skill when a repository needs the Linear-backed Lotus rules.

## Inspect First

1. check whether `.local/AGENTS.md` and `.docs/AGENTS.md` already exist
2. inspect current ignore rules for `.local/`
3. read root `AGENTS.md` when present for host repo constraints, but do not
   edit it unless the human explicitly asks
4. preserve existing project-specific Linear configuration when merging rules

## Apply

- create `.local/AGENTS.md` from `assets/local-agents.md` when missing
- create `.docs/AGENTS.md` from `assets/docs-agents.md` when missing
- when either file already exists, merge only the missing Linear-backed rules
  and preserve repo-specific constraints
- ensure `.local/` is ignored via `.git/info/exclude`, `.gitignore`, or another
  repo-local ignore surface
- do not create Linear issues, Linear documents, or external tickets during init
- do not create local operational artifact directories; active issue, progress,
  review, and PR-note state belongs in Linear for this variant

## Required Local Configuration

Ensure `.local/AGENTS.md` defines these keys, even when the value is still a
placeholder:

```yaml
linear_team: <team-key-or-name>
linear_project: <project-name-or-id>
linear_flow_document: <document-title-or-id>
source_policy: <local-only|remote-read-through|remote-clone>
external_writes: disallowed-by-default
```

## Operating Rules

- keep `.local/` private and machine-local
- keep `.docs/` durable and concise
- keep all generated project and operational text in English
- use Linear as the operational source of truth after initialization
- write to external systems only after explicit human authorization for that
  target and action

## Assets

- `assets/local-agents.md`
- `assets/docs-agents.md`
