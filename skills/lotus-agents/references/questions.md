# Questions Workflow

Use this workflow when clarification needs to be captured in `.local/`.

## Output Files

- `.local/questions/q<issue-id>.md`
- `.local/questions/q<revision-id>.md`
- `.local/questions/q001.md`
- `.local/questions/q002.md`

`q<revision-id>.md` matches the main local artifact contract when review-based
work creates a revision id such as `<issue-id>-r001`.

## Rules

- use `q<issue-id>.md` when the work is tied to an existing issue id
- use `q<revision-id>.md` when review-based work created a revision id
- otherwise use the next zero-padded numeric file
- ask only meaningful questions
- group related questions in one file
- if the question blocks execution, stop and wait
- if the question does not block execution, continue with an explicit assumption
  recorded in notes or the run log

## Format

```md
# Questions - q001

## q1

### Question
...

### Answer
...
```

## Typical Use

- during planning
- during ambiguity
- during issue work
- during review work
- during non-issue runs
