---
name: lotus-init
description: Initialize the Lotus `.local` + `.docs` workflow in a repository. Use when Codex needs to add the base Lotus structure, seed `.local/AGENTS.md` and `.docs/AGENTS.md`, create `.docs/spec`, `.docs/meetings/_draft.md`, `.docs/templates`, and set ignore rules for `.local` plus optional local-only `.docs`.
---

# Lotus Init

Use this skill when a repository needs the base Lotus setup.

## Inspect First

1. check whether these already exist:
   - `.local/AGENTS.md`
   - `.local/issues/`
   - `.local/issues-notes/`
   - `.local/reviews/`
   - `.local/pr-notes/`
   - `.docs/AGENTS.md`
   - `.docs/spec/`
   - `.docs/meetings/`
   - `.docs/templates/`
   - `.docs/practices/`
2. check current ignore rules for `.local/` and `.docs/`
3. read root `AGENTS.md` when present for host repo constraints, but do not
   edit it unless the human explicitly asks

## Apply

- create the minimal missing base structure:
  - `.local/AGENTS.md` from `assets/local-agents.md`
  - `.local/issues/`
  - `.local/issues-notes/`
  - `.local/reviews/`
  - `.local/pr-notes/`
  - `.docs/AGENTS.md` from `assets/docs-agents.md`
  - `.docs/spec/`
  - `.docs/meetings/_draft.md` from `assets/meetings-draft-template.md`
  - `.docs/templates/`
- create `.docs/practices/` only when the user wants practice files or wants
  the fuller starter shape
- when `.local/AGENTS.md` or `.docs/AGENTS.md` already exists, merge only the
  missing Lotus rules and preserve repo-specific constraints

## Ignore Rules

- ensure `.local/` is ignored via `.git/info/exclude`, `.gitignore`, or another
  repo-local ignore surface
- ignore `.docs/` only when the user explicitly wants Lotus docs to stay
  local-only
- when the user has not said whether `.docs/` should stay local-only, ask
  before ignoring it

## Operating Rules

- do not create or update root `AGENTS.md` as part of Lotus setup unless the
  human explicitly asks
- do not create `AGENTS_TO_COPY.md` or `AGENTS_ISSUE_FLOW.md`
- do not create `.local/context.md`, `.local/questions/`, or `.local/runs/`
- keep the setup minimal when the repo already has part of the structure

## Assets

- `assets/local-agents.md`
- `assets/docs-agents.md`
- `assets/meetings-draft-template.md`
