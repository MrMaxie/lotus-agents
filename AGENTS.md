# Lotus Agents - Repository Contract

## What This Repository Is

This repo defines a `.local` + `.docs` workflow for human-agent work.

The current product shape is:

- `README.md` is the main human entrypoint
- each root `lotus-*` directory is an installable skill
- `.codex-plugin/plugin.json` bundles the skill collection for native Codex
  plugin installation

## What This Repository Is Not

Do not treat this repo as a consumer repository by default.

- root `.local/` may contain local examples, not the product contract
- root `.docs/` may not exist
- do not bootstrap consumer `.local/` or `.docs/` in this repo unless a human
  explicitly asks

## Working Rules In This Repo

When changing the contract or adoption story:

1. keep `README.md` aligned with the relevant `lotus-*/SKILL.md` files and
   their assets
2. keep the model centered on `.local/AGENTS.md` and `.docs/AGENTS.md`
3. keep `.local/` private-first and `.docs/` required in the workflow but
   optional to commit
4. do not reintroduce `AGENTS_TO_COPY.md`, `AGENTS_ISSUE_FLOW.md`, `docs/`,
   `.local/context.md`, `.local/questions/`, or `.local/runs/`
5. do not reintroduce setup scripts, path configuration, or custom layout
   support unless a human explicitly asks
6. keep skills optional, task-focused, and copy-paste friendly
7. keep reusable templates in the relevant skill assets or in consumer
   `.docs/templates/`, not in one legacy copy artifact

## Write For The Actual Reader

Keep each artifact scoped to the reader that will actually use it:

- `README.md` is for humans adopting or understanding the repo
- `AGENTS.md` and `lotus-*/` are for agents executing work
- keep install and adoption guidance in `README.md`, not in machine-facing
  workflow files
- keep machine-facing files operational; avoid self-descriptions and historical
  narration
- if a file is meant to be executed or followed by an agent, write only the
  rules and expectations needed at execution time

## What To Update Together

If you change naming, paths, or adoption flow, review at least:

- `README.md`
- `.codex-plugin/plugin.json`
- `lotus-agents/`
- `lotus-init/`
- any other affected `lotus-*` skill directories

## Source Of Truth For This Repo

When working in this repository, use this order:

1. explicit human instruction in the current run
2. `.local/AGENTS.md` when present
3. this `AGENTS.md`
4. `README.md`
5. the current repository state and diff

## Restrictions

- do not fabricate missing root consumer structure unless a human asks
- do not add back removed legacy docs just for explanation
- do not turn optional skills into required repository contents
- do not create automation, CI, or packaging flow unless requested
