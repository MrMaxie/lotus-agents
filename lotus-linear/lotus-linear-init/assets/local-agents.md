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
