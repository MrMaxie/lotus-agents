# SKILL: REVIEW_PROCESS

## PURPOSE

Official optional extension for review-based work.

## INPUT

- review comments from the active review system

## OUTPUT

When local execution memory is in use:

1. `.local/reviews/<issue-id>-r001.md`
2. `.local/reviews/<issue-id>-r001-answers.md`
3. `.local/issues/<issue-id>-r001.md`
4. `.local/issues-notes/<issue-id>-r001.md`

Revision indexes MUST use zero-padded numeric form: `r001`, `r002`, `r003`, ...
Review comment identifiers inside review files use `c1`, `c2`, `c3`, ...

## STRUCTURE

### review file

```md
# Review - <issue-id>-r001

## c1
<comment>
```

### answers file

```md
# Review Answers - <issue-id>-r001

## c1

### Proposed Reply
...

### Fix Notes
...
```

## FLOW

1. collect review comments
2. store only new comments that are not already captured in prior review files
3. create a sub-issue using the next revision index
4. process that sub-issue like normal issue work
5. use `q<revision-id>.md` for blocking questions when questions are needed
6. update the answers file after the fixes are done

## PR NOTES EXTENSION

When generating PR notes after review:

- include only meaningful changes
- ignore trivial fixes
- highlight new behavior and major improvements
