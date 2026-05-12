# Linear Project Flow

## Project Configuration
- Linear Team: <team-key-or-name>
- Linear Project: <project-name-or-id>
- Flow Document: <document-title-or-id>
- Source Policy: <local-only|remote-read-through|remote-clone>
- External Writes: disallowed-by-default

## Source Systems
- Local: tasks created directly by the human or agent; no external source link
  applies
- Remote Ticket: cloned from Jira, Azure DevOps, GitHub Issues, or another
  tracker; requires exact source ID, URL, and `Remote Ticket` tag
- Remote PR Review: cloned from a PR review/comment; requires PR URL and comment
  permalink or comment ID

## Read/Write Policy
- Write operational state to Linear issues, comments, documents, and status
  updates
- Read external systems only when needed for source freshness or project rules
- Do not write to external systems without explicit human authorization for the
  target and action

## Recurring Hygiene
- Keep active tasks linked to the configured project
- Use cycles when the project already uses cycles
- Refresh remote-sourced tasks before replying externally or closing them
- Add progress comments when work pauses, resumes, blocks, or becomes ready for
  review
- Keep Linear status, progress comments, and PR links current when the work
  state changes materially
- Do not assign people to Linear issues, GitHub pull requests, or related tasks
  unless the human explicitly asks for assignment or the next step is a manual
  human action

## Branch And Pull Request Hygiene
- Use only `feat/<taskid>`, `fix/<taskid>`, `chore/<taskid>`, or
  `epic/<epictaskid>` branch names for implementation work
- Use lowercase Linear identifiers for `<taskid>` and `<epictaskid>`, for
  example `feat/max-77`, `chore/max-82`, or `epic/max-72`
- Do not use Linear-generated or personal-prefix branch names such as
  `maxie/max-77-...`
- Title pull requests as `<TASKID>: <short Linear-aligned description>`
- Use the repository pull request template when opening GitHub pull requests and
  fill every applicable section
- Write PR titles, descriptions, implementation notes, verification notes, and
  risks in English
- Open implementation PRs ready for review by default; use draft PRs only when
  the human explicitly asks for a draft
- Before committing, inspect the full worktree, stage only intended files, and
  exclude test leftovers, generated scratch files, logs, traces, and debug
  artifacts

## Agent Starting Point
1. Read `.local/AGENTS.md`
2. Read this document
3. Inspect the target Linear issue or project
4. Inspect relevant Linear project resources, files, documents, issues, and
   comments
5. Read external sources only when required by policy or missing context
