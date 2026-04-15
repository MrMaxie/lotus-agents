---
name: lotus-agents
description: Install and operate the Lotus Agents `.local`-first issue flow for human-agent work. Use when Codex needs to add this workflow to a repository, merge it into an existing `AGENTS.md`, install it as `AGENTS_ISSUE_FLOW.md`, follow Lotus `.local` artifact conventions, draft PR notes from the bundled template, or apply the review/spec-sync conventions used by Lotus Agents.
---

# Lotus Agents

Install and apply the Lotus Agents workflow as one packaged skill.

## Core Capabilities

Use this skill to:

- adopt the Lotus flow into another repository
- choose and apply the right `AGENTS` scenario instead of only describing it
- operate inside a repo that already uses Lotus `.local` conventions
- bootstrap `.local/pr-notes/<id>.md` from the bundled template
- follow the Lotus review, question, spec-sync, and commit-title conventions

## Adoption Workflow

When the user wants Lotus Agents added to a target repo:

1. Inspect the target repo first:
   - whether `AGENTS.md` exists
   - whether `.local/` already exists
   - whether `docs/specs/` or `docs/meetings/` exist
2. Choose exactly one adoption scenario:
   - no `AGENTS.md`: copy `assets/AGENTS_TO_COPY.md` to `AGENTS.md`
   - existing `AGENTS.md` and direct merge requested: merge only the relevant
     workflow sections, using `assets/merge-sections.md` as the merge scope
   - existing `AGENTS.md` and small additive change requested: copy
     `assets/AGENTS_TO_COPY.md` to `AGENTS_ISSUE_FLOW.md` and add
     `assets/additional-issue-flow-snippet.md` to the existing `AGENTS.md`
3. Apply the selected scenario when the user asks for adoption. Do not stop at
   prose instructions when the request is to perform the change.
4. Keep the host repo's established rules when merging. Add only the Lotus
   issue-flow contract that is actually needed.

## Operating Rules

- Treat `.local/` as private execution state, not durable shared truth.
- Do not create `.local/` or `docs/` by surprise when the repo intentionally
  does not use them.
- When a reusable template exists, prefer the bundled asset over inventing a
  new local snippet.
- When changing the Lotus contract in this repo, keep these files aligned:
  - root `AGENTS_TO_COPY.md`
  - `assets/AGENTS_TO_COPY.md`
  - `README.md`

## Reference Map

Read only the references needed for the active task:

- `references/questions.md`: clarification files in `.local/questions/`
- `references/review-process.md`: review revisions and answer files
- `references/spec-sync.md`: `docs/specs/` drift handling
- `references/commit-title.md`: concise commit-title proposals
- `references/pr-notes.md`: user-facing PR notes behavior

## Assets

- `assets/AGENTS_TO_COPY.md`: canonical Lotus flow artifact
- `assets/additional-issue-flow-snippet.md`: snippet for the
  `AGENTS_ISSUE_FLOW.md` scenario
- `assets/merge-sections.md`: merge scope for an existing `AGENTS.md`
- `assets/pr-notes-template.md`: starter file for `.local/pr-notes/<id>.md`
