# Lotus Agents

Lotus Agents is a portable runtime contract for human-agent collaboration. It
is meant to make agent work deterministic across resumes, clearer to audit, and
less dependent on a single prompt.

The contract is intentionally narrow. It answers four questions:

1. what the agent reads
2. what counts as source of truth
3. where local execution state belongs
4. when the agent must avoid creating new structure

Normative rules live in `AGENTS.md`. This file explains the system to humans.

## What Lives In This Repository

- `AGENTS.md` - canonical runtime contract
- `START_HERE.md` - consumer-repo entry point
- `REFERENCE.md` - consolidated secondary reference
- `INTEGRATION.md` - adoption and bootstrap guidance
- `RATIONALE.md` - why the system exists and what it refuses to decide
- `skills/` - focused workflow modules
- `templates/` - starter files for shared and local artifacts
- `scripts/` - bootstrap and validation helpers
- `examples/` - adoption shapes and a reference run
- `lotus.config.yaml.example` - path override example
- `lotus.config.schema.json` - machine-readable config schema

Compatibility entrypoints remain in `OVERVIEW.md`, `ARTIFACT_MATRIX.md`, and
`CONTRACT_CHECKLIST.md`, but `REFERENCE.md` is the canonical secondary
reference.

## Core Model

Lotus Agents separates three knowledge layers:

- committed runtime rules in `AGENTS.md`
- durable project knowledge in the active docs source
- local execution memory under the configured local root

The execution loop is always:

1. ARRANGE
2. ACT
3. ASSERT

## Design Intent

Lotus Agents is designed to make agent work:

- deterministic about what it reads before it changes anything
- explicit about what outranks what
- resumable without inventing durable structure on the fly
- portable across repositories with different layouts and maturity levels
- auditable by both humans and agents

## Non-Goals

Lotus Agents does not try to be:

- a process framework
- an issue tracker
- a review tool
- a documentation system for every repository
- a mandate that every repository must have local execution memory

## When The Contract Is Silent

When the contract does not prescribe a single action, the agent should:

- prefer the smallest coherent change
- avoid guessing identifiers or intent
- ask a question when ambiguity blocks the work
- otherwise continue with an explicit assumption recorded in notes or a run log
- avoid creating new durable structure without explicit human intent

## Audiences

- `AGENTS.md` is for agents and any human validating the runtime contract
- `START_HERE.md` is for humans integrating Lotus Agents into another repository
- `REFERENCE.md` is for humans and agents who need a compact shared reference
- `RATIONALE.md` is for maintainers deciding whether the system is the right fit

## Adopting It In Another Repository

The promoted adoption model is `Copy Pack`.

Use `scripts/init.ps1` or `scripts/init.sh` from this repository to copy the
starter pack into a target repository, or copy the pack manually. The target
repository keeps its own `README.md`; Lotus Agents should not replace it.

The recommended starter pack is:

1. `AGENTS.md`
2. `START_HERE.md`
3. `REFERENCE.md`
4. `skills/`
5. `templates/`
6. `lotus.config.yaml.example`
7. `lotus.config.schema.json`
8. optional `scripts/validate-contract.ps1`
9. optional `scripts/validate-contract.sh`

Then choose one of three adoption modes:

- minimal repository with no docs and no local memory
- repository with local execution memory under the configured local root
- repository with custom paths resolved through `lotus.config.yaml`

See `START_HERE.md` for the short path, `INTEGRATION.md` for more detail, and
`examples/` for concrete shapes.

## About This Repository

This repository defines Lotus Agents itself. It now includes bootstrap and
validation material intended to make reuse less ambiguous. It is still not
using the full runtime contract against itself as a consuming repository. That
self-hosted reference can happen later once the cleanup is stable enough to
reuse without caveats.
