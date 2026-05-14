---
lotus: managed-artifact
scope: local
artifactType: local-guidance
schemaVersion: 1
contentVersion: "1.0.0"
privacy: private
contentClass: user-editable
selectedProfiles:
  - local-first
  - linear-first
selectedAgents: []
selectedProcedures:
  - private-project-guidance
---

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
- workflow source config: `.local/workflow.lotus.json`
- private workflow details: `.local/WORKFLOW.md`
- private credentials or access notes: `.local/CREDENTIALS.md`
- reproduction screenshots: `.local/screenshots/`
- reproduction logs: `.local/logs/`

`revision-id` uses `<issue-id>-r001`, `<issue-id>-r002`, and so on.

## Working Rules

- `.local/` is private execution state
- source-of-truth behavior is controlled by `.local/workflow.lotus.json`;
  `local-first` uses Lotus local files for current work, while `linear-first`
  uses Linear as the operational source and keeps `.local/` as private
  configuration and execution notes
- remote systems may provide supporting context, but they are not the canonical
  Lotus state
- when `.local/workflow.lotus.json` exists, follow its selected profiles,
  source priority, source-of-truth modes, write permissions, and hygiene
  procedure
- `.local/WORKFLOW.md` may contain local URLs, credentials notes, preferred
  tools, and interactive source details; do not copy those values into public
  docs, commits, comments, issues, or package output
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

## Branch And Pull Request Hygiene

- when implementation work uses GitHub pull requests, use only
  `feat/<taskid>`, `fix/<taskid>`, `chore/<taskid>`, or
  `epic/<epictaskid>` branch names
- `<taskid>` and `<epictaskid>` are lowercase Linear issue identifiers, such as
  `feat/max-77`, `chore/max-82`, or `epic/max-72`
- do not use personal-prefix, generated, or descriptive slug branch names
- title pull requests as `<TASKID>: <short Linear-aligned description>`
- use the repository pull request template when opening GitHub pull requests and
  fill every applicable section
- write PR titles, descriptions, implementation notes, verification notes, and
  risks in English
- open implementation PRs ready for review by default; use draft PRs only when
  the human explicitly asks for a draft
- leave Linear issues, GitHub pull requests, and related workflow tasks
  unassigned unless the human explicitly asks for assignment or the next step is
  a clearly manual human action such as PR review, manual verification, or
  approval
- before committing, inspect the full worktree, stage only intended files, and
  exclude test leftovers, generated scratch files, logs, traces, and debug
  artifacts
