# SKILL: SPEC_SYNC

Optional skill. It can live in the repo or be installed globally on the
machine.

## APPLIES WHEN

- `docs/specs/` exists
- `docs/meetings/` may exist, but is optional input

## INPUT

- `docs/specs/`
- up to the last 3 files from `docs/meetings/` when present
- codebase
- issue notes or run log when present

## RULES

- if `docs/specs/` does not exist, stop and report `not applicable`
- if `docs/meetings/` does not exist, continue without meeting input
- NEVER modify meetings
- extract ONLY durable knowledge
- ignore cosmetic changes
- do not invent missing spec sources
- do not create `docs/`
- for bug drift, fix code to match durable expectations
- for edge-case drift, update specs and record the note
- for expectation drift, update specs and record the durable change

## LOGIC

1. read `docs/specs/`
2. read up to the last 3 meeting files when `docs/meetings/` exists
3. classify changes:
   - bug
   - edge-case
   - expectation change

4. apply:

bug:
- fix code

edge-case:
- update spec
- record the note in issue notes or the run log
- suggest a test

expectation:
- update spec definition
- record the note when it changes durable expectations

## OUTPUT

- `not applicable` when `docs/specs/` is absent
- updated code when bug drift is confirmed
- updated specs when durable expectations need to change
