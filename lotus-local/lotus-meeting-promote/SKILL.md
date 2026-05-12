---
name: lotus-meeting-promote
description: Promote `.docs/meetings/_draft.md` into a dated meeting note. Use when Codex needs to structure draft meeting notes, ask the human for missing details, write the final meeting file, and reset the draft template.
---

# Lotus Meeting Promote

Use this skill when `.docs/meetings/_draft.md` should become a durable meeting
note.

## Inspect First

1. read `.docs/AGENTS.md`
2. read `.docs/meetings/_draft.md`
3. inspect the latest 3 dated files in `.docs/meetings/` for local naming and
   formatting patterns
4. inspect `.docs/templates/meeting.md` when it exists

## Apply

- if `_draft.md` is missing or empty, stop and report that there is nothing to
  promote
- ask the human about missing or ambiguous date, title, participants, or key
  decisions when that would weaken the final note
- create `.docs/meetings/YYYY-MM-DD.md` or
  `.docs/meetings/YYYY-MM-DD-<slug>.md`, following the existing repo pattern
- use `.docs/templates/meeting.md` when it exists; otherwise use
  `assets/meeting-template.md`
- after a successful promotion, reset `.docs/meetings/_draft.md` with
  `assets/meeting-draft-template.md`

## Operating Rules

- never rewrite prior meeting files
- keep the final note structured and durable
- keep open questions and follow-ups explicit
- keep `_draft.md` as the working buffer for the next meeting, not as archive

## Assets

- `assets/meeting-template.md`
- `assets/meeting-draft-template.md`
