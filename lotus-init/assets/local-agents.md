# Local Agent Rules

## Read Order

1. explicit human instruction
2. `.local/AGENTS.md`
3. `.docs/AGENTS.md`
4. relevant files in `.docs/spec/`
5. up to the latest 3 dated files from `.docs/meetings/`
6. relevant files in `.docs/practices/`
7. the codebase and current diff

## Local Artifacts

- issue inputs: `.local/issues/<issue-id>.md`
- issue notes: `.local/issues-notes/<issue-id>.md`
- review notes: `.local/reviews/<revision-id>.md`
- review answers: `.local/reviews/<revision-id>-answers.md`
- PR notes: `.local/pr-notes/<id>.md`

`revision-id` uses `<issue-id>-r001`, `<issue-id>-r002`, and so on.

## Working Rules

- `.local/` is private execution state
- do not store durable project truth in `.local/`
- do not create `context.md`, `questions/`, or `runs/`
- if ambiguity blocks execution, ask the human
- if ambiguity does not block execution, continue with an explicit assumption
  and record it in issue notes or review answers
- keep edits minimal and follow the host repo's existing code and docs patterns
