---
lotus: managed-artifact
scope: local
artifactType: local-guidance
schemaVersion: 1
contentVersion: "0.1.0"
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

## Project Configuration

Set these keys before Linear-backed intake work starts:

```yaml
linear_team: <team-key-or-name>
linear_project: <project-name-or-id>
linear_flow_document: <document-title-or-id>
source_policy: <local-only|remote-read-through|remote-clone>
external_writes: disallowed-by-default
```

`external_writes` must stay `disallowed-by-default` unless the human explicitly
changes the policy for this repository.

## Read Order

1. explicit human instruction
2. `.local/AGENTS.md`
3. configured Linear project and `linear_flow_document`
4. relevant Linear project resources, documents, files, issues, and comments
5. the codebase and current diff

## Operational Store

- Linear issues hold active task descriptions and source links
- Linear comments hold progress, review clones, reviewer reply proposals, and
  PR-note proposals
- Linear documents and files hold project flow rules, specs, reusable templates,
  and recurring operational guidance
- `.local/` holds private configuration and machine-local notes only

## Working Rules

- treat Linear as the operational source of truth for current work
- do not store issue status, progress, review state, PR-note proposals, specs,
  templates, or project rules in local files for this workflow
- use external systems as read-only sources unless the human explicitly
  authorizes the exact external write
- for remote-sourced tasks, keep exact source IDs and URLs in Linear
- for local or self-generated tasks, state that no external source applies
- before writing an owner-addressed proposal, call Linear `_get_profile` and
  derive the mention from `displayName` as `@<displayName>`
- keep operational text concise, technical, and in English
- do not say that the agent is working in an internal workflow
- if ambiguity blocks execution, ask the human
- if ambiguity does not block execution, continue with an explicit assumption
  and record it in Linear
- keep edits minimal and follow the host repo's existing code and docs patterns

## Branch And Pull Request Hygiene

- when implementation work uses GitHub pull requests, use only
  `feat/<taskid>`, `fix/<taskid>`, `chore/<taskid>`, or
  `epic/<epictaskid>` branch names
- `<taskid>` and `<epictaskid>` are lowercase Linear issue identifiers, such as
  `feat/max-77`, `chore/max-82`, or `epic/max-72`
- do not use Linear-generated, personal-prefix, or descriptive slug branch names
  such as `maxie/max-77-...`
- title pull requests as `<TASKID>: <short Linear-aligned description>`
- use the repository pull request template when opening GitHub pull requests
- leave Linear issues, GitHub pull requests, and related workflow tasks
  unassigned unless the human explicitly asks for assignment or the next step is
  a clearly manual human action such as PR review, manual verification, or
  approval
