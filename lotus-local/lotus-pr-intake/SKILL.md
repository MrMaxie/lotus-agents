---
name: lotus-pr-intake
description: Pull issue, PR, review, and CI work into Lotus artifacts. Use when Codex needs to treat local Lotus files as the operational source of truth, normalize work into `.local/issues`, `.local/issues-notes`, `.local/reviews`, and `.local/pr-notes`, and use remote providers only as optional supporting context.
---

# Lotus PR Intake

Use this skill when the work starts from existing Lotus files or when the human
references issue, PR, review, or CI context that should be captured into Lotus
artifacts.

## Inspect First

1. inspect existing `.local/issues/`, `.local/issues-notes/`, `.local/reviews/`,
   and `.local/pr-notes/` files for relevant local state, naming, and formatting
   patterns
2. determine whether the task is issue-based, PR-based, review-based, or CI-based
3. infer an `issue-id` from local artifacts, explicit human input, branch, or
   PR number when possible
4. inspect `.docs/templates/` for project-local templates
5. only if needed, check whether the human explicitly asked for remote context
   or whether required context is missing from local files

## Inputs

- explicit human input
- existing Lotus local artifacts
- optional remote provider context from `gh`, `acli`, or current PR review / CI
  context

## Outputs

- `.local/issues/<issue-id>.md`
- `.local/issues-notes/<issue-id>.md`
- `.local/reviews/<revision-id>.md`
- `.local/reviews/<revision-id>-answers.md`
- `.local/pr-notes/<id>.md` when user-facing change notes are needed

`revision-id` uses `<issue-id>-r001`, `<issue-id>-r002`, and so on.

## Template Rules

- prefer these project-local templates when they exist:
  - `.docs/templates/issue.md`
  - `.docs/templates/issue-notes.md`
  - `.docs/templates/review.md`
  - `.docs/templates/review-answers.md`
  - `.docs/templates/pr-notes.md`
- otherwise use the bundled assets

## Operating Rules

- treat Lotus files as the operational source of truth for the current work
- treat remote systems as external references, not as canonical Lotus state
- shared IDs may link local and remote artifacts, but they remain separate
  entities
- do not synchronize local artifacts to remote state unless the human
  explicitly asks for that workflow
- do not overwrite or reshape local artifact truth just because a remote system
  differs
- fetch remote context only when the human explicitly asks for it or when the
  needed information is absent from local files and required to proceed
- do not create `.local/questions/`, `.local/runs/`, or `.local/context.md`
- if ambiguity blocks execution, ask the human directly
- if ambiguity does not block execution, continue with an explicit assumption
  and record it in issue notes or review answers
- keep PR notes user-facing and avoid internal symbol dumps
- when review-based work creates a new revision, store only the new review
  material in that revision's artifacts

## Assets

- `assets/issue-template.md`
- `assets/issue-notes-template.md`
- `assets/review-template.md`
- `assets/review-answers-template.md`
- `assets/pr-notes-template.md`
