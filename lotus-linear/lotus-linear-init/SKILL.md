---
name: lotus-linear-init
description: Initialize the Linear-backed Lotus workflow in a repository. Use when Codex needs to seed `.local/AGENTS.md` for a workflow where Linear is the canonical operational and durable project store.
---

# Lotus Linear Init

Use this skill when a repository needs the Linear-backed Lotus rules.

## Inspect First

1. check whether `.local/AGENTS.md`, `.local/WORKFLOW.md`, and
   `.local/workflow.lotus.json` already exist
2. inspect current ignore rules for `.local/`
3. read root `AGENTS.md` when present for host repo constraints, but do not
   edit it unless the human explicitly asks
4. preserve existing project-specific Linear configuration when merging rules

## Apply

- create `.local/AGENTS.md` from `assets/local-agents.md` when missing
- when the file already exists, merge only the missing Linear-backed rules
  and preserve repo-specific constraints
- ensure `.local/` is ignored via `.git/info/exclude`, `.gitignore`, or another
  repo-local ignore surface
- do not create Linear issues, Linear documents, or external tickets during init
- keep active issue, progress, review, PR-note, and durable project state in
  Linear for this variant
- keep `.docs/AGENTS.md` and reusable `.docs` templates available as durable
  agent guidance; they are not the operational Linear work state
- local Lotus directories may exist only as private execution notes or
  compatibility stores; they are not the operational source when
  `.local/workflow.lotus.json` selects `linear-first`

## Required Local Configuration

Prefer `.local/workflow.lotus.json` for selected profiles, source priority,
source-of-truth modes, write permissions, and hygiene. Keep private
project-specific details in `.local/WORKFLOW.md` or `.local/AGENTS.md`, even
when the value is still a placeholder:

```yaml
linear_team: <team-key-or-name>
linear_project: <project-name-or-id>
linear_flow_document: <document-title-or-id>
source_policy: <local-only|remote-read-through|remote-clone>
external_writes: disallowed-by-default
```

## Operating Rules

- keep `.local/` private and machine-local
- keep all generated project and operational text in English
- use Linear as the operational and durable project source of truth after
  initialization
- write to external systems only after explicit human authorization for that
  target and action

## Assets

- `assets/local-agents.md`
