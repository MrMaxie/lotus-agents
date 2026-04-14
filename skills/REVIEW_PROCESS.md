# SKILL: REVIEW_PROCESS

## PURPOSE

Official optional extension for review-based work.

## INPUT

- review comments from the active review system

## OUTPUT

When local execution memory is in use:

1. `<reviews_dir>/<revision-id>.md`
2. `<reviews_dir>/<revision-id>-answers.md`
3. `<issues_dir>/<revision-id>.md`
4. `<issue_notes_dir>/<revision-id>.md`

`revision-id` means `<issue-id>-r001`, `<issue-id>-r002`, and so on.

Revision indexes MUST use zero-padded numeric form: `r001`, `r002`, `r003`,
and so on. Review comment identifiers inside review files use `c1`, `c2`, `c3`,
and so on.

## STRUCTURE

### review file

```md
# Review - <revision-id>

## Source
...

## Scope
...

## New Comments

### c1
...
```

### answers file

```md
# Review Answers - <revision-id>

## c1

### Proposed Reply
...

### Fix Notes
...
```

## FLOW

1. collect review comments
2. store only new comments that are not already captured in prior review files
3. create a revision issue using the next revision index
4. process that revision issue like normal issue work
5. use `q<revision-id>.md` for blocking questions when questions are needed
6. update the answers file after the fixes are done

## PR NOTES EXTENSION

When generating PR notes after review:

- include only meaningful changes
- ignore trivial fixes
- highlight new behavior and major improvements
