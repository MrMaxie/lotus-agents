# Lotus Agents - Integration Guide

Use this guide when a repository wants to consume Lotus Agents as a starting
point.

## Quick Start

Use one of these two paths:

1. run `scripts/init.ps1` or `scripts/init.sh` from this repository and point it
   at the target repository
2. copy the starter pack manually

The recommended starter pack for a target repository is:

- `AGENTS.md`
- `START_HERE.md`
- `REFERENCE.md`
- `skills/`
- `templates/`
- `lotus.config.yaml.example`
- `lotus.config.schema.json`
- optional `scripts/validate-contract.ps1`
- optional `scripts/validate-contract.sh`

Do not replace the target repository's own `README.md` with this repository's
`README.md`.

## Minimal Adoption

Use the contract without bootstrapping docs or local execution memory when:

- the repository is small
- the work is mostly one-shot
- resumable local notes are not yet needed

In that mode, the agent still uses `AGENTS.md`, the codebase, the diff, and any
durable docs that already exist.

## Adoption With Local Execution Memory

When a repository wants resumable local state:

1. create the configured `local_root` only when a human explicitly wants local
   execution memory
2. inside it, create only the directories you need
   - `issues_dir`
   - `issue_notes_dir`
   - `questions_dir`
   - `runs_dir`
   - optional `reviews_dir`
   - optional `pr_notes_dir`
3. optionally add
   - `local_agents_file`
   - `context_file`

The default paths for those directories are documented in `AGENTS.md` and the
schema example.

## Adoption With Custom Paths

When a repository uses different directory names, create `lotus.config.yaml`
from the example file and map every Lotus Agents path explicitly.

Typical reasons:

- docs already live under another directory
- local operational notes are stored somewhere other than `.local/`
- the repository uses a different default branch than `main` or `master`

Use `lotus.config.schema.json` to validate the keys and expected value shapes.

## Docs Source Rules

The docs rules are intentionally strict:

- if the committed docs tree exists, it is the only active durable docs source
- local-only docs are a fallback only when the committed docs tree does not
  exist
- if a human asks for local draft docs while committed docs exist, keep them as
  local artifacts under `local_root`; they are not the active docs source
- do not bootstrap committed docs or local-only docs unless a human explicitly
  asked for that

## Optional Extensions

Review artifacts and PR notes are official optional extensions.

Adopt them only when the repository actually needs:

- structured review processing
- stored review replies
- local PR description drafts

## Validation

After copying the starter pack:

1. review `AGENTS.md` and adjust only what is repository-specific
2. add a `lotus.config.yaml` only if the defaults are wrong for that repository
3. run `scripts/validate-contract.ps1` or `scripts/validate-contract.sh` in the
   target repository if you copied the validation helper

## Examples

See:

- [examples/consumer-repo/01-minimal](examples/consumer-repo/01-minimal/README.md)
- [examples/consumer-repo/02-with-local](examples/consumer-repo/02-with-local/README.md)
- [examples/consumer-repo/03-custom-layout](examples/consumer-repo/03-custom-layout/README.md)
- [examples/reference-run](examples/reference-run/README.md)
