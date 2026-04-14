# SKILL: SPEC_SYNC

## INPUT
- last 3 meetings
- codebase

## RULES

- NEVER modify meetings
- extract ONLY durable knowledge
- ignore cosmetic changes

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
- add warning

expectation:
- update spec definition

## OUTPUT
- updated specs