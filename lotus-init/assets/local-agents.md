# Local Agent Rules

## Read Order

1. explicit human instruction
2. `.local/AGENTS.md`
3. `.docs/AGENTS.md`
4. `.docs/spec/_toc.md` when present, then the relevant linked files in
   `.docs/spec/`
5. up to the latest 3 dated files from `.docs/meetings/`
6. `.docs/practices/_toc.md` when present, then the relevant linked files in
   `.docs/practices/`
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
- Lotus local files are the operational source of truth for current work
- remote systems may provide supporting context, but they are not the canonical
  Lotus state
- shared IDs between local and remote artifacts do not make them the same
  object
- do not synchronize local artifacts with remote state unless the human
  explicitly asks
- if remote context is needed, prefer existing local files first and fetch
  externally only when the needed context is missing or the human explicitly
  requests a remote source
- do not store durable project truth in `.local/`
- treat linked entity docs under `.docs/spec/` and `.docs/practices/` as the
  durable context surface for understanding the codebase
- prefer docs that keep names explicit, concise, in English, and anchored to
  the code-facing context they describe
- do not create `context.md`, `questions/`, or `runs/`
- if ambiguity blocks execution, ask the human
- if ambiguity does not block execution, continue with an explicit assumption
  and record it in issue notes or review answers
- keep edits minimal and follow the host repo's existing code and docs patterns
