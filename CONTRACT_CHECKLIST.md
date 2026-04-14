# Lotus Agents - Contract Checklist

Use this checklist before calling a Lotus Agents variant stable enough to reuse.

## Core Contract

- `AGENTS.md` is the only normative rules file
- `README.md` is onboarding and intent, not a second rules engine
- `OVERVIEW.md` is a compact mental model, not a duplicate contract
- task shapes are explicit: issue-based, review-based, general run
- naming rules for issue ids, revision ids, and numeric indexes are explicit
- meeting selection order is deterministic

## Path Coverage

- every committed docs path is configurable or has a default
- every local execution artifact path is configurable or has a default
- the local agents file and context file are configurable
- local-only docs have explicit semantics and path defaults
- default branch behavior is explicit

## Artifact Coverage

- every artifact mentioned in `skills/` has a template or is intentionally
  documented as free-form
- review comment identifiers do not collide with question identifiers
- optional extensions are clearly marked as optional
- question files, issue notes, run logs, review files, and PR notes all have
  starter templates

## Reuse Readiness

- the repository includes an integration guide
- the repository includes at least one minimal consumer example
- the repository includes an example with local execution memory
- the repository includes an example with custom path overrides
