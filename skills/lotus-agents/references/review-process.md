# Review Process Workflow

Use this workflow when local execution memory is in use for review-based work.

## Input

- review comments from the active review system

## Output

When local execution memory is in use:

1. `.local/reviews/<revision-id>.md`
2. `.local/reviews/<revision-id>-answers.md`
3. `.local/issues/<revision-id>.md`
4. `.local/issues-notes/<revision-id>.md`

`revision-id` means `<issue-id>-r001`, `<issue-id>-r002`, and so on.

Revision indexes MUST use zero-padded numeric form: `r001`, `r002`, `r003`,
and so on. Review comment identifiers inside review files use `c1`, `c2`, `c3`,
and so on.

Those revision-scoped issue files match the main local artifact contract when a
repo uses this review flow. They are not introduced as a private naming
convention by this workflow alone.

## Structure

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

## Flow

1. collect review comments
2. store only new comments that are not already captured in prior review files
3. create a revision issue using the next revision index
4. process that revision issue like normal issue work
5. use `q<revision-id>.md` for blocking questions when questions are needed
6. update the answers file after the fixes are done

## PR Notes Extension

When generating PR notes after review:

- include only meaningful changes
- ignore trivial fixes
- highlight new behavior and major improvements
