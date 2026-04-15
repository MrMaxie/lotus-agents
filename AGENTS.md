# Lotus Agents - Repository Contract

## What This Repository Is

This repo defines a small `.local`-first issue flow for human-agent work.

The current product shape is:

- `README.md` is the main human entrypoint
- `AGENTS_TO_COPY.md` is the copyable flow artifact for consumer repos
- `skills/lotus-agents/` is the main installable skill package
- `.codex-plugin/plugin.json` bundles that skill for native Codex plugin
  installation

## What This Repository Is Not

Do not treat this repo as a consumer repository by default.

- root `.local/` may not exist
- root `docs/` may not exist
- do not bootstrap either one unless a human explicitly asks

## Working Rules In This Repo

When changing the contract or adoption story:

1. keep `README.md` and `AGENTS_TO_COPY.md` aligned
2. keep `skills/lotus-agents/assets/AGENTS_TO_COPY.md` aligned with the root
   copy
3. keep the model `.local`-first and copy-paste friendly
4. do not reintroduce setup scripts, path config, or custom layout support
   unless a human explicitly asks
5. keep skills clearly optional
6. keep reusable templates in optional skill assets, not in the default
   consumer `.local` contract

## Write For The Actual Reader

Keep each artifact scoped to the reader that will actually use it:

- `README.md` is for humans adopting or understanding the repo
- `AGENTS.md`, `AGENTS_TO_COPY.md`, and `skills/` are for agents executing work
- keep copy/merge/install/setup guidance in `README.md`, not in machine-facing
  workflow files
- keep machine-facing files operational; avoid self-descriptions such as "this
  file is for...", "copy this file as...", or other README-style narration
- if a file is meant to be executed or followed by an agent, write only the
  instructions that matter at execution time

## What To Update Together

If you change naming, paths, or adoption flow, review at least:

- `README.md`
- `AGENTS_TO_COPY.md`
- `skills/lotus-agents/assets/AGENTS_TO_COPY.md`
- any relevant files in `skills/`

## Source Of Truth For This Repo

When working in this repository, use this order:

1. explicit human instruction in the current run
2. `.local/AGENTS.md` when present
3. this `AGENTS.md`
4. `README.md`
5. the current repository state and diff

## Restrictions

- do not fabricate missing repo structure
- do not add back removed legacy docs just for explanation
- do not turn optional skills into required repository contents
- do not create automation, CI, or packaging flow unless requested
