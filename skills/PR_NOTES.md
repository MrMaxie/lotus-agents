# SKILL: PR_NOTES

## PURPOSE

Official optional extension for user-facing change summaries.

## OUTPUT FILE

`<pr_notes_dir>/<id>.md` when local execution memory is in use

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
- use the PR notes template when bootstrapping a new file

## STYLE

- concise
- business-oriented
