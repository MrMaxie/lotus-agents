# Lotus Agents

Lotus Agents is a portable runtime contract for human-agent collaboration. It
is meant to make agent work deterministic across resumes, clearer to audit, and
less dependent on a single prompt.

The contract is intentionally narrow. It answers four questions:

1. what the agent reads
2. what counts as source of truth
3. where local execution state belongs
4. when the agent must avoid creating new structure

Normative rules live in `AGENTS.md`. This file is the human-facing guide.

## What Lives In This Repository

- `AGENTS.md` - canonical runtime contract
- `OVERVIEW.md` - compact mental model
- `INTEGRATION.md` - practical adoption steps
- `ARTIFACT_MATRIX.md` - when each file exists and what it means
- `CONTRACT_CHECKLIST.md` - consistency checklist for maintainers
- `skills/` - focused workflow modules
- `templates/` - starter files for local artifacts
- `examples/consumer-repo/` - small adoption examples
- `lotus.config.yaml.example` - path override example

## Core Model

Lotus Agents separates three knowledge layers:

- committed runtime rules in `AGENTS.md`
- durable project knowledge in `docs/` or a configured equivalent
- local execution memory in `.local/` or a configured equivalent

The execution loop is always:

1. ARRANGE
2. ACT
3. ASSERT

## Why This Helps

Lotus Agents is designed to make agent work:

- resumable across runs
- easier to audit
- safer when docs, meetings, and local notes all exist
- more portable between repositories with different maturity levels

It is not meant to impose a heavyweight process on every repository.

## Official Optional Extensions

Review artifacts and PR notes are part of the system, but they are optional.
Repositories can adopt the core runtime contract without using review files,
PR notes, or any local execution memory at all.

## Adopting It In Another Repository

Start with:

1. `AGENTS.md`
2. `README.md`
3. `OVERVIEW.md`
4. `INTEGRATION.md`
5. `ARTIFACT_MATRIX.md`
6. `CONTRACT_CHECKLIST.md`
7. `skills/`
8. `templates/`
9. `lotus.config.yaml.example`

Then choose one of three adoption modes:

- minimal repository with no docs and no local memory
- repository with local execution memory under `.local/`
- repository with custom paths resolved through `lotus.config.yaml`

See [INTEGRATION.md](INTEGRATION.md) for the quick-start checklist and
[examples/consumer-repo](examples/consumer-repo) for concrete shapes.

## What Lotus Agents Does Not Require

Lotus Agents does not require:

- a specific issue tracker
- a specific code host
- a specific review system
- a fixed repository layout
- durable docs in every repository

## About This Repository

This repository defines Lotus Agents itself. It does not yet consume the full
local execution flow internally. That self-hosting step can happen later once
the contract is stable enough to reuse without caveats.
