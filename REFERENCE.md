# Lotus Agents - Reference

`AGENTS.md` is the only normative rules file. This document consolidates the
secondary reference material for humans and agents.

## Mental Model

Lotus Agents is a runtime contract built around four questions:

1. what the agent reads
2. what counts as source of truth
3. where local execution memory belongs
4. when the agent must avoid creating new structure

The contract separates three knowledge layers:

- runtime rules in `AGENTS.md`
- durable project knowledge in the active docs source
- local execution memory under the configured local root

The agent always works through:

1. ARRANGE
2. ACT
3. ASSERT

The active docs source is resolved once during ARRANGE:

- if the committed docs tree exists, it is the active docs source
- otherwise, if the configured local-only docs tree exists, that tree is the
  active docs source
- otherwise there is no active docs source

Within the active docs source, specs outrank the latest 3 meeting files.

## Artifact Matrix

| Artifact | Created when | Purpose | Durability |
| --- | --- | --- | --- |
| `AGENTS.md` | always in a Lotus Agents repo | canonical runtime contract | committed |
| `START_HERE.md` | when a repo wants a local onboarding entry point | human-facing adoption shortcut | committed |
| `REFERENCE.md` | when a repo wants one shared secondary reference | compact shared reference | committed |
| `lotus.config.yaml` | only when the default path layout is wrong for that repo | path and branch overrides | committed |
| `lotus.config.schema.json` | when config validation is desired | machine-readable config contract | committed |
| local agents file | only when a repository needs local override rules | machine-local override layer | local |
| context file | only when a repository benefits from resumable local execution context | local execution memory | local |
| committed specs | only when persistent docs exist | durable project truth | committed |
| committed meetings | only when persistent meeting notes exist | chronological human context | committed, read-only |
| local specs | only when local-only docs are explicitly requested and committed docs do not exist | durable local-only expectations | local |
| local meetings | only when local-only docs are explicitly requested and committed docs do not exist | chronological local context | local, read-only |
| issue file | issue-based or review-based work with local execution memory | task-local context | local |
| issue notes file | issue-based or review-based work with local execution memory | execution notes and resume point | local |
| question file for issue or revision | issue-based or review-based work with unresolved questions | structured human clarification | local |
| run log | general runs with local execution memory | non-issue execution notes | local |
| question file for general run | general runs with unresolved questions | structured human clarification | local |
| review file | review-based work when review artifacts are used | captured review comments for one revision | local |
| review answers file | review-based work when stored replies are needed | proposed replies and fix notes | local |
| PR notes file | only when the human asks for PR notes or a PR description | user-facing change summary | local |

## Naming Rules

- issue ids keep the repository-native identifier when filename-safe
- revision ids use `<issue-id>-r001`, `<issue-id>-r002`, and so on
- general run indexes use `001`, `002`, `003`, and so on
- human questions use `q<issue-id>.md`, `q<revision-id>.md`, or `q001.md`
- review comments inside review files use `c1`, `c2`, `c3`, and so on

## Maintainer Checklist

Use this before calling a Lotus Agents variant stable enough to reuse:

- `AGENTS.md` is the only normative rules file
- `README.md` explains the system, not the runtime rules
- `START_HERE.md` is a consumer-repo entry point, not a second contract
- `REFERENCE.md` is the canonical secondary reference
- task shapes are explicit: issue-based, review-based, general run
- naming rules for issue ids, revision ids, and numeric indexes are explicit
- active docs source resolution is explicit
- the local agents file is constrained to machine-local or temporary overrides
- docs rules make committed docs the only active durable source when they exist
- every artifact mentioned in `AGENTS.md` or `skills/` has a template or is
  intentionally documented as free-form
- review comment identifiers do not collide with question identifiers
- helper docs use configured path names when describing behavior
- the repository includes at least one minimal consumer example
- the repository includes an example with local execution memory
- the repository includes an example with custom path overrides
- the repository includes one end-to-end reference run
