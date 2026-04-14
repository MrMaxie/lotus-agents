# Lotus Agents - Repository Guide For Agents

This `AGENTS.md` is for agents working on the Lotus Agents repository itself.
It is not the file humans are meant to copy into other repositories.

The copyable artifact lives in `AGENTS_TO_COPY.md`.

## What This Repository Is

This repo defines a small `.local`-first issue flow for human-agent work.

The current product shape is:

- `README.md` is the main human entrypoint
- `AGENTS_TO_COPY.md` is the copyable flow artifact for consumer repos
- `skills/` contains optional example skills
- `examples/` shows adoption shapes and a fuller reference run

## What This Repository Is Not

Do not treat this repo as a consumer repository by default.

- root `.local/` may not exist
- root `docs/` may not exist
- do not bootstrap either one unless a human explicitly asks

## Working Rules In This Repo

When changing the contract or adoption story:

1. keep `README.md`, `AGENTS_TO_COPY.md`, and `examples/` aligned
2. keep the model `.local`-first and copy-paste friendly
3. do not reintroduce setup scripts, path config, or custom layout support
   unless a human explicitly asks
4. keep skills clearly optional
5. treat `.local/templates/` as private helper material, not committed source of
   truth in consumer repos

## What To Update Together

If you change naming, paths, or adoption flow, review at least:

- `README.md`
- `AGENTS_TO_COPY.md`
- `examples/consumer-repo/`
- `examples/reference-run/`
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
