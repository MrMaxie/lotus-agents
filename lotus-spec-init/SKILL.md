---
name: lotus-spec-init
description: Bootstrap or refresh `.docs/spec/` for Lotus repositories. Use when Codex needs to create the first target-state spec, add a missing spec branch to an existing Lotus repo, or reseed `.docs/spec/` from the Lotus default structure.
---

# Lotus Spec Init

Use this skill when the repository needs the first durable target-state spec or
an additional Lotus-style spec starter.

## Inspect First

1. read `.docs/AGENTS.md` when present
2. inspect existing files in `.docs/spec/`, including `_toc.md` indexes when
   present
3. inspect `.docs/templates/` for a project-local spec template
4. preserve any established naming pattern or branch structure in `.docs/spec/`

## Apply

- create `.docs/spec/` if it does not exist yet
- if the repo already uses a spec naming pattern or `_toc.md` branch structure,
  follow it
- otherwise create `.docs/spec/_toc.md`
- prefer `.docs/templates/spec.md` when it exists
- otherwise use `assets/spec-template.md`
- when the spec naturally breaks into multiple topics, use `_toc.md` as the
  branch index and create only the smallest linked entity files needed

## Operating Rules

- keep the output durable and business-readable
- keep the output concise and in English
- call out code-facing names exactly as used and state what context they belong
  to
- prefer small named entity docs over one long narrative when the topic has
  clear boundaries
- cross-link entities, flows, constraints, and referenced files when that adds
  context
- include technical constraints only when they matter to the intended project
  state
- do not create large starter packs or speculative extra spec files
- do not create `.docs/practices/` as part of spec bootstrap

## Asset

- `assets/spec-template.md`
