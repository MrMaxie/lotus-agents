# SKILL: SPEC_SYNC

## INPUT

- active specs
- last 3 meetings
- codebase
- issue notes or run log when present

## RULES

- NEVER modify meetings
- extract ONLY durable knowledge
- ignore cosmetic changes
- follow the spec drift rules from `AGENTS.md`

## LOGIC

1. parse meetings
2. classify changes:
   - bug
   - edge-case
   - expectation change

3. apply:

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

- updated specs
