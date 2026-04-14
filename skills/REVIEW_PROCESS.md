# SKILL: REVIEW_PROCESS

## INPUT
- gh review comments

## OUTPUT

1. .local/reviews/<id>-r<index>.md
2. .local/reviews/<id>-r<index>-answers.md
3. .local/issues/<id>-r<index>.md

---

## STRUCTURE

### review file

# q1
<comment>

---

### answers file

# q1

## Proposed GitHub Reply
...

## Internal Notes
...

---

## FLOW

1. collect comments
2. structure them
3. create sub-issue
4. process normally
5. update answers after fixes

---

## PR NOTES EXTENSION

When generating PR notes after review:

- include ONLY meaningful changes
- ignore trivial fixes
- highlight:
  - new behavior
  - major improvements