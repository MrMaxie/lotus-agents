---
name: lotus-linear-intake
description: Capture issue, PR, review, CI, and remote-source work into Linear-backed Lotus state. Use when Codex needs to create or update Linear issues, comments, documents, or project status from local instructions and read-only external context while treating Linear as the canonical operational store.
---

# Lotus Linear Intake

Use this skill when work should be normalized into Linear instead of local
operational files.

## Inspect First

1. read `.local/AGENTS.md` for `linear_team`, `linear_project`,
   `linear_flow_document`, `source_policy`, and `external_writes`
2. use Linear to inspect the configured project, project resources, files, and
   flow document before
   creating or updating operational state
3. determine whether the task is local, self-generated, remote-ticket,
   remote-PR-review, PR-note, review-answer, or CI-based
4. fetch external context only when the human requested it, local/project rules
   require it, or the needed context is missing from Linear

## Source And Write Policy

- Linear is the canonical operational store for this workflow
- Linear issues and comments are the durable operational context for this
  workflow
- `.local/` is private configuration and machine-local context, not issue,
  review, or PR-note state
- `.docs/` may still hold repository guidance, specs, and reusable templates
  when the repo keeps that context near the code
- external systems are read-only by default
- if `external_writes` is `disallowed-by-default`, do not write to Jira,
  GitHub, Azure DevOps, Confluence, or other remote systems without explicit
  human authorization for the exact target and action
- local or self-generated tasks record `Source Type: Local` or
  `Source Type: Self-Generated` and do not need a remote link
- remote-sourced tasks must keep the exact source system, source ID, and source
  URL in Linear
- remote tickets must carry the `Remote Ticket` label or tag in Linear; if
  labels are unavailable, include `Tags: Remote Ticket` in the issue body

## Linear Profile Requirement

Before publishing any owner-addressed proposal comment, verify that the
available Linear connector session can resolve the current user or target owner
context needed for the mention.

Stop before publishing if:

- Linear tools are unavailable
- the connector cannot resolve the required user context
- the target Linear issue cannot be resolved

Do not guess, cache, or hardcode the mention. Ask the human to connect Linear
or provide the missing target context instead.

## Apply

- create or update Linear issues with `assets/linear-issue-template.md`
- add progress comments with `assets/progress-comment-template.md`
- clone Jira or other remote tickets with
  `assets/remote-ticket-clone-template.md`
- clone PR or review comments with
  `assets/remote-pr-review-clone-template.md`
- publish PR-note proposals as Linear comments with
  `assets/pr-note-proposal-template.md`
- create or update project flow documents with
  `assets/linear-flow-document-template.md`
- use project templates from configured Linear resources only when they are
  stricter than the bundled template and preserve all required source/link
  fields

## Voice

- write all Linear artifacts in English
- be concise, technical, and action-oriented
- write PR-note proposals as the PR author preparing text for the owner to use
- write reviewer replies as the PR author responding to the reviewer
- do not mention internal workflow names in Linear artifacts
- do not include implementation symbol dumps unless the target template asks for
  specific files or public API names

## Assets

- `assets/linear-issue-template.md`
- `assets/progress-comment-template.md`
- `assets/remote-ticket-clone-template.md`
- `assets/remote-pr-review-clone-template.md`
- `assets/pr-note-proposal-template.md`
- `assets/linear-flow-document-template.md`
