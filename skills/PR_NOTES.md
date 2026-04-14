# SKILL: PR_NOTES

## PURPOSE

Official optional extension for user-facing change summaries.

## OUTPUT FILE

`.local/pr-notes/<id>.md` when local execution memory is in use

## RULES

- describe WHAT changed from the user perspective
- avoid:
  - class names
  - implementation details
- include:
  - feature changes
  - behavior updates
  - relevant refactors

## UPDATE MODE

IF file exists:
- merge changes
- produce a final version, not a changelog

## TEMPLATE HANDLING

- preserve:
  - screenshots sections
  - video sections
  - unknown sections
- do not fill a section if you are unsure
- use the PR notes template when bootstrapping a new file

## STYLE

- concise
- business-oriented
