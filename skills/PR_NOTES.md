# SKILL: PR_NOTES

Optional skill. It can live in the repo or be installed globally on the
machine.

## PURPOSE

Official optional extension for user-facing change summaries.

## OUTPUT FILE

`.local/pr-notes/<id>.md` when local execution memory is in use

## RULES

- describe what changed from the user perspective
- avoid:
  - class names
  - implementation details
- include:
  - feature changes
  - behavior updates
  - relevant refactors

## UPDATE MODE

If the file exists:

- merge changes
- produce a final version, not a changelog

## TEMPLATE HANDLING

- preserve:
  - screenshot sections
  - video sections
  - unknown sections
- do not fill a section if you are unsure
- use a private template from `.local/templates/` when bootstrapping a new file

## STYLE

- concise
- business-oriented
