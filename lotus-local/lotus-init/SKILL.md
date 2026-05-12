---
name: lotus-init
description: Initialize the Lotus `.local` + `.docs` workflow in a repository. Use when Codex needs to add the base Lotus structure, seed `.local/AGENTS.md` and `.docs/AGENTS.md`, create `.docs/spec`, `.docs/meetings/_draft.md`, `.docs/templates`, and choose whether `.docs` should stay committed or local-only.
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
3. inspect whether the repository looks mature or still bootstrap-only:
   - mature: substantial existing product code, signs of ongoing maintenance,
     or a repo that has clearly lived for a while
   - early: very few files, mostly example or starter code, or almost no real
     product code yet
4. read root `AGENTS.md` when present for host repo constraints, but do not
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
- if the user has already said whether `.docs/` should stay committed or
  local-only, follow that
- if the repo already has meaningful code and the agent can ask a short
  clarifying question, ask which version the human prefers
- if the repo already has meaningful code and the agent cannot ask or should
  not block on the question, default to hidden `.docs/`:
  - keep `.docs/` local-only
  - ensure `.docs/` is ignored
  - mention that the human can ask to unhide or commit `.docs/` later
- if the repo is still early, mostly bootstrap, example-heavy, or almost
  empty, default to committed `.docs/`:
  - do not ignore `.docs/`
  - mention that the human can ask to hide `.docs/` later

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
