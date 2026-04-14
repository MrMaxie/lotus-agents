# Lotus Agents - Runtime Contract

## Purpose

Lotus Agents is a portable runtime contract, not a process framework.

For every run, the contract should answer four questions:

1. what the agent reads
2. what counts as source of truth
3. where local execution state belongs
4. when the agent must avoid creating new structure

This repository defines the Lotus Agents contract itself. It is not yet
bootstrapped as a consuming repository, so do not assume that `.local/` exists
here unless a human explicitly asks to initialize it.

## Scope

Lotus Agents does not require:

- a specific issue tracker
- a specific code host
- a specific review system
- a fixed repository layout beyond the configured paths
- durable docs in every repository

## Precedence

When instructions or knowledge sources conflict, apply this order:

1. explicit human instruction in the current run
2. the configured local agents file, default `.local/AGENTS.md`
3. `AGENTS.md`
4. the active docs source resolved during ARRANGE
   - the active specs directory
   - the latest 3 files from the active meetings directory
5. the codebase and current repository state

The configured local agents file is only for machine-local, temporary, or
execution-specific overrides. It MUST NOT redefine durable project truth that
belongs in committed docs or other shared repository artifacts.

The configured context file is execution memory, not durable source of truth.
It may guide the current run, but it does not outrank human instructions, the
local agents file, `AGENTS.md`, or the active docs source.

## Path Resolution

If `lotus.config.yaml` exists, use it before assuming default paths. Relative
paths are resolved from the repository root.

| Key | Default |
| --- | --- |
| `docs_root` | `docs` |
| `specs_dir` | `docs/specs` |
| `meetings_dir` | `docs/meetings` |
| `local_root` | `.local` |
| `local_agents_file` | `.local/AGENTS.md` |
| `context_file` | `.local/context.md` |
| `local_docs_root` | `.local/docs` |
| `local_specs_dir` | `.local/docs/specs` |
| `local_meetings_dir` | `.local/docs/meetings` |
| `issues_dir` | `.local/issues` |
| `issue_notes_dir` | `.local/issues-notes` |
| `questions_dir` | `.local/questions` |
| `runs_dir` | `.local/runs` |
| `reviews_dir` | `.local/reviews` |
| `pr_notes_dir` | `.local/pr-notes` |
| `default_branch` | `auto` |

When `default_branch` is `auto`, detect whether the repository uses `main` or
`master`. If both exist, prefer the repository default branch. If neither is
available and no default branch can be detected, use explicit human input when
available and otherwise ask or record an explicit assumption.

## ARRANGE

Before acting, the agent MUST:

1. resolve paths from `lotus.config.yaml` when present
2. identify the base branch
   - use the branch explicitly provided by the human when available
   - otherwise use `default_branch` when it is set to a concrete branch name
   - otherwise detect `main` or `master`
3. identify the task shape
   - issue-based work
   - review-based work
   - general run without an issue id
4. infer whether the work is tied to an issue id
   - gather candidates from human input, branch naming, and local issue files
   - if exactly one unambiguous candidate exists, use it
   - if no candidate exists, continue as a general run
   - if multiple plausible candidates exist, do not guess
   - ask a question when the ambiguity blocks execution; otherwise continue with
     an explicit assumption recorded in notes or the run log
5. inspect local context when available
   - read the configured local agents file if it exists
   - read the configured context file if it exists
   - if an issue id exists, read `<issues_dir>/<issue-id>.md` if it exists
6. resolve the active docs source
   - if `docs_root` exists, the committed docs tree is the active docs source
   - otherwise, if `local_docs_root` exists, the local-only docs tree is the
     active docs source
   - otherwise there is no active docs source
   - if a human asks for local draft docs while the committed docs tree exists,
     treat those drafts as local artifacts under `local_root`, not as the active
     docs source
7. read active docs deterministically
   - read the active specs directory when present
   - read at most the latest 3 files from the active meetings directory when
     present
   - if meeting filenames begin with `YYYY-MM-DD`, sort descending by filename
   - otherwise sort descending by modification time
8. understand repository context
   - inspect the diff against the base branch
   - inspect existing code and repository patterns before changing anything

If `local_root` does not exist and the human did not ask to bootstrap it, skip
local artifacts for that run instead of creating them.

### Task Profiles

| Task shape | Reads when present after ARRANGE resolution | Local writes when local execution memory is in use | Notes file | Question file | Stop when |
| --- | --- | --- | --- | --- | --- |
| `issue-based` | human instruction, local rules, context, issue file, active specs, latest meetings, diff | code or docs changes, issue notes, optional questions | `<issue_notes_dir>/<issue-id>.md` | `<questions_dir>/q<issue-id>.md` | blocking ambiguity, missing permissions, or missing human input |
| `review-based` | issue-based inputs plus active review comments and prior revision artifacts when present | review file, review answers, revision issue file, revision issue notes, optional questions | `<issue_notes_dir>/<revision-id>.md` | `<questions_dir>/q<revision-id>.md` | blocking ambiguity, missing permissions, or missing human input |
| `general run` | human instruction, local rules, context, active specs, latest meetings, diff | run log, optional questions | `<runs_dir>/<index>.md` | `<questions_dir>/q<index>.md` | blocking ambiguity, missing permissions, or missing human input |

## Naming and Identifiers

- `issue id` means a stable, repository-native task identifier taken from human
  input, branch naming, or local issue files.
- Preserve the issue id as written when filename-safe. When filesystem rules
  make that unsafe, replace only illegal path characters with `-`.
- `revision id` means `<issue-id>-r001`, `<issue-id>-r002`, and so on. Revision
  indexes are zero-padded numeric values.
- Non-issue helper indexes use zero-padded numeric values such as `001`, `002`,
  `003`.
- Issue and revision question files use `q<issue-id>.md` or
  `q<revision-id>.md`.
- Review comment identifiers inside review artifacts use `c1`, `c2`, `c3`, and
  so on. Do not reuse `q1` because `q*` is reserved for human questions.

## ACT

Agent MUST:

1. make minimal changes
2. reuse existing logic and patterns
3. avoid duplication
4. write only the local artifacts implied by the active task profile or the
   human request
5. validate continuously against specs, repo conventions, and diff sanity

When a concrete issue id exists, the issue notes file is the primary execution
note file. General run logs must not duplicate that role.

## ASSERT

Agent MUST:

1. validate behavior against the current source of truth
2. reconcile code and docs when they drift

If implementation and spec differ:

- if the spec is correct, fix the code
- if a durable edge case was discovered, update the spec, record the note in the
  issue notes file or run log, and suggest a test
- if the expected behavior changed, update the spec to harden the definition

Agent MUST NEVER modify meeting files.

## Docs Policy

Documentation directories are created or bootstrapped only on explicit human
intent.

Rules:

- do not create the committed docs tree or the local-only docs tree on your own
- if the human says only "generate docs", default to the committed docs tree
- if the committed docs tree exists, it is the only active durable docs source
- local-only docs are a fallback only when the committed docs tree does not
  exist
- if the human explicitly asks for local-only docs and the committed docs tree
  does not exist, use the local-only docs tree
- if the human explicitly asks for local draft docs while the committed docs
  tree exists, store them under `local_root` as local artifacts and do not treat
  them as the active docs source
- if neither docs tree exists, do not invent documentation structure unless the
  human explicitly asked for docs to be bootstrapped

The local-only docs tree mirrors the same semantics as the committed docs tree:

- `specs` holds durable expectations for the active local workflow
- `meetings` holds chronological local context and remains read-only

Durable behavior belongs in specs. One-off notes and temporary execution
context belong in the configured local root.

## Optional Extensions

Review workflow artifacts and PR notes are official optional extensions. They
are part of the Lotus Agents system, but not every repository needs them.

Rules:

- repositories may omit `reviews_dir` and `pr_notes_dir` until needed
- use review artifacts only for review-based work or explicit human requests
- use PR notes only when the human asks for a PR description, PR notes, or a
  user-facing change summary

## Glossary

- `active docs source`: the committed docs tree when present, otherwise the
  configured local-only docs tree when present
- `durable knowledge`: reusable project truth that belongs in specs
- `local execution memory`: machine-local operational state kept under the
  configured local root
- `bootstrap`: creating docs or local execution structure that did not already
  exist
- `general run`: work that has no concrete issue id
- `issue-based work`: work tied to one issue id
- `review-based work`: work tied to review feedback and a derived revision id

## Restrictions

- do not fabricate answers
- do not push commits automatically
- do not create pull requests automatically
- do not modify meeting files
- do not bootstrap docs or local execution memory without explicit human intent
