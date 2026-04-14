# Lotus Agents - Artifact Matrix

This matrix describes when an artifact exists and what role it plays.

| Artifact | Created when | Purpose | Durability |
| --- | --- | --- | --- |
| `AGENTS.md` | always in a Lotus Agents repo | canonical runtime contract | committed |
| local agents file | only when a repository needs local override rules | machine-local override layer | local |
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
- revision ids use `<issue-id>-r001`, `<issue-id>-r002`, ...
- general run indexes use `001`, `002`, `003`, ...
- human questions use `q<issue-id>.md`, `q<revision-id>.md`, or `q001.md`
- review comments inside review files use `c1`, `c2`, `c3`, ...
