# PR Notes Workflow

Use this workflow when creating or updating user-facing change summaries.

## Output File

`.local/pr-notes/<id>.md` when local execution memory is in use

## Input

- diff
- issue notes or run notes when they exist
- existing `.local/pr-notes/<id>.md` when updating

## Rules

- describe what changed from the user perspective
- avoid implementation details such as class names and internal symbols
- include feature changes, behavior changes, and meaningful refactors
- produce a final summary, not a changelog fragment

## Template Handling

- when creating a new file, start from `assets/pr-notes-template.md`
- preserve screenshot, video, and unknown sections when they already exist
- do not invent content for sections you are unsure about

## Style

- concise
- business-oriented
