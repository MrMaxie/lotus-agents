# Lotus Agents - Copyable Issue Flow

Use this file in one of three ways:

1. copy it as the repo's `AGENTS.md`
2. merge selected sections into an existing `AGENTS.md`
3. copy it as `AGENTS_ISSUE_FLOW.md` and reference it from an existing
   `AGENTS.md`

If this file is copied into another repository as `AGENTS.md`, treat it as the
repo's main agents file and ignore any wording below about "extra flow files".

If this file is copied into another repository as `AGENTS_ISSUE_FLOW.md` and
referenced from the main `AGENTS.md`, the host repository's `AGENTS.md` wins on
conflicts unless it says otherwise.

## Read Order

When issue flow matters, read in this order:

1. explicit human instruction
2. `.local/AGENTS.md` when present
3. the repo's `AGENTS.md`
4. `AGENTS_ISSUE_FLOW.md` when referenced as an extra flow file
5. `docs/specs/` and then the latest 3 files from `docs/meetings/`
6. the codebase and current diff

`.local/context.md` is memory, not durable truth.

## Fixed Paths

Use these conventions instead of configuring path names:

- `.local/AGENTS.md`
- `.local/context.md`
- `.local/templates/`
- `.local/issues/`
- `.local/issues-notes/`
- `.local/questions/`
- `.local/runs/`
- `.local/reviews/`
- `.local/pr-notes/`
- `docs/specs/`
- `docs/meetings/`

Create only the directories a given repo actually needs.

## Flow

Before changing anything:

1. identify the base branch from human input, repo default, or `main`/`master`
2. detect whether the work is issue-based, review-based, or a general run
3. infer an issue id from human input, branch naming, or `.local/issues/` when
   possible
4. read `.local/AGENTS.md`, `.local/context.md`, and the relevant issue file
   when they exist
5. read committed specs and at most the latest 3 meeting files when `docs/`
   exists
6. inspect the diff and current repository patterns

If `.local/` does not exist and the human did not ask for it, do not bootstrap
it by surprise.

## Artifact Rules

- issue inputs: `.local/issues/<issue-id>.md`
- issue notes: `.local/issues-notes/<issue-id>.md`
- review revisions: `<issue-id>-r001`, `<issue-id>-r002`, and so on
- review notes: `.local/reviews/<revision-id>.md`
- review answers: `.local/reviews/<revision-id>-answers.md`
- general runs: `.local/runs/001.md`, `.local/runs/002.md`, and so on
- questions: `.local/questions/q<issue-id>.md`, `q<revision-id>.md`, or
  `q001.md`
- PR notes: `.local/pr-notes/<id>.md`

Use `.local/templates/` only for private helper snippets. Templates are not a
source of truth.

## Docs Rules

- `docs/` is optional and committed
- `docs/specs/` holds durable expectations
- `docs/meetings/` holds chronological context
- never rewrite meeting files
- do not create `docs/` unless a human asks for it

## Working Rules

- make minimal changes
- reuse existing logic and patterns
- avoid duplication
- keep durable truth in committed docs
- keep temporary execution state in `.local/`
- if ambiguity blocks execution, ask
- otherwise continue with an explicit assumption recorded in local notes
