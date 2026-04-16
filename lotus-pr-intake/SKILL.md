---
name: lotus-pr-intake
description: Pull issue, PR, review, and CI work into Lotus artifacts. Use when Codex needs to gather inputs with `gh` and `acli`, normalize them into `.local/issues`, `.local/issues-notes`, `.local/reviews`, and `.local/pr-notes`, and keep assumptions inside those artifacts instead of separate question or run files.
---

# Lotus PR Intake

Use this skill when the work starts from GitHub issues, pull requests, review
comments, or CI results.

## Inspect First

1. determine whether the task is issue-based, PR-based, review-based, or CI-based
2. infer an `issue-id` from the human input, branch, PR number, or current
   local artifacts when possible
3. inspect `.docs/templates/` for project-local templates
4. inspect existing `.local/issues/`, `.local/issues-notes/`, `.local/reviews/`,
   and `.local/pr-notes/` files for naming or formatting patterns

## Inputs

- explicit human input
- `gh`
- `acli`
- current PR review or CI context

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
