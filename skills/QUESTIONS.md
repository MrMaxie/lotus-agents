# SKILL: QUESTIONS

## PURPOSE

Maintain the human clarification loop for issue-based work, review-based work,
and general runs.

## FILES

- `<questions_dir>/q<issue-id>.md`
- `<questions_dir>/q<revision-id>.md`
- `<questions_dir>/q001.md`
- `<questions_dir>/q002.md`

## RULES

- use `q<issue-id>.md` when the work is tied to an existing issue id
- use `q<revision-id>.md` when review-based work created a revision id
- otherwise use the next zero-padded numeric file
- ask only meaningful questions
- group related questions in one file
- if the question blocks execution, stop and wait
- if the question does not block execution, continue with an explicit assumption
  recorded in notes or the run log

## FORMAT

```md
# Questions - q001

## q1

### Question
...

### Answer
...
```

## USAGE

- during planning
- during ambiguity
- during issue work
- during review work
- during non-issue runs
