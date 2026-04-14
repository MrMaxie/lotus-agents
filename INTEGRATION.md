# Lotus Agents - Integration Guide

Use this guide when a repository wants to consume Lotus Agents as a starting
point.

## Quick Start

1. Copy these committed files into the target repository:
   - `AGENTS.md`
   - `README.md`
   - `OVERVIEW.md`
   - `INTEGRATION.md`
   - `ARTIFACT_MATRIX.md`
   - `CONTRACT_CHECKLIST.md`
   - `skills/`
   - `templates/`
   - `lotus.config.yaml.example`
2. Decide whether the repository needs local execution memory.
3. If yes, add `.local/` to `.git/info/exclude`.
4. Create `.local/` only when a human explicitly wants it.
5. Copy `lotus.config.yaml.example` to `lotus.config.yaml` only when the target
   repository does not use the default path layout.

## Minimal Adoption

Use the contract without bootstrapping docs or local execution memory when:

- the repository is small
- the work is mostly one-shot
- resumable local notes are not yet needed

In that mode, the agent still uses `AGENTS.md`, the codebase, the diff, and any
existing durable docs that are already present.

## Adoption With Local Execution Memory

When a repository wants resumable local state:

1. add `.local/` to `.git/info/exclude`
2. create only the directories you need:
   - `.local/issues/`
   - `.local/issues-notes/`
   - `.local/questions/`
   - `.local/runs/`
   - optional `.local/reviews/`
   - optional `.local/pr-notes/`
3. optionally add:
   - `.local/AGENTS.md`
   - `.local/context.md`

Do not create `.local/` just because Lotus Agents exists. Create it when the
repository actually benefits from local execution memory.

## Adoption With Custom Paths

When a repository uses different directory names, create `lotus.config.yaml`
from the example file and map every Lotus Agents path explicitly.

Typical reasons:

- docs already live under another directory
- local operational notes are stored somewhere other than `.local/`
- the repo uses a different default branch than `main` or `master`

## Local-Only Docs

Use local-only docs only when the human explicitly asks for them.

If local-only docs are bootstrapped, mirror the committed docs semantics:

- `specs/` for durable expectations
- `meetings/` for chronological context

If committed docs exist, they always win over local-only docs.

## Optional Extensions

Review artifacts and PR notes are official optional extensions.

Adopt them only when the repository actually needs:

- structured review processing
- stored review replies
- local PR description drafts

## Examples

See:

- [examples/consumer-repo/01-minimal](examples/consumer-repo/01-minimal/README.md)
- [examples/consumer-repo/02-with-local](examples/consumer-repo/02-with-local/README.md)
- [examples/consumer-repo/03-custom-layout](examples/consumer-repo/03-custom-layout/README.md)
