---
name: lotus-spec-init
description: Bootstrap or refresh `.docs/spec/` for Lotus repositories. Use when Codex needs to create the first target-state spec, add a missing spec file to an existing Lotus repo, or reseed `.docs/spec/` from the Lotus default structure.
---

# Lotus Spec Init

Use this skill when the repository needs the first durable target-state spec or
an additional Lotus-style spec starter.

## Inspect First

1. read `.docs/AGENTS.md` when present
2. inspect existing files in `.docs/spec/`
3. inspect `.docs/templates/` for a project-local spec template
4. preserve any established naming pattern in `.docs/spec/`

## Apply

- create `.docs/spec/` if it does not exist yet
- if the repo already uses a spec naming pattern, follow it
- otherwise create `.docs/spec/project-target-state.md`
- prefer `.docs/templates/spec.md` when it exists
- otherwise use `assets/spec-template.md`

## Operating Rules

- keep the output durable and business-readable
- include technical constraints only when they matter to the intended project
  state
- do not create large starter packs or speculative extra spec files
- do not create `.docs/practices/` as part of spec bootstrap

## Asset

- `assets/spec-template.md`
