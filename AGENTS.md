# Lotus Agents - Repository Contract

## What This Repository Is

This repo defines a `.local` + `.docs` workflow for human-agent work.

The current product shape is:

- `README.md` is the main human entrypoint
- `lotus-local/` is the local-first installable skill package root
- `lotus-linear/` is the Linear-backed installable skill package root
- `.codex-plugin/plugin.json` bundles the skill collection for native Codex
  plugin installation

## What This Repository Is Not

Do not treat this repo as a consumer repository by default.

- root `.local/` may contain local examples, not the product contract
- root `.docs/` may not exist
- do not bootstrap consumer `.local/` or `.docs/` in this repo unless a human
  explicitly asks

## Working Rules In This Repo

When changing the contract or adoption story:

1. keep `README.md` aligned with the relevant skills under `lotus-local/` and
   `lotus-linear/`
2. keep the model centered on `.local/AGENTS.md` and `.docs/AGENTS.md`
3. keep `.local/` private-first and `.docs/` required in the workflow but
   optional to commit
4. do not reintroduce `AGENTS_TO_COPY.md`, `AGENTS_ISSUE_FLOW.md`, `docs/`,
   `.local/context.md`, `.local/questions/`, or `.local/runs/`
5. do not reintroduce setup scripts, path configuration, or custom layout
   support unless a human explicitly asks
6. keep skills optional, task-focused, and copy-paste friendly
7. keep reusable templates in the relevant skill assets or in consumer
   `.docs/templates/`, not in one legacy copy artifact

## Code Style

- Name files in camelCase by default.
- Name files that define classes or components in PascalCase.
- Prefer named exports; use default exports only when a tool or framework
  requires them.
- Prefer TypeScript `type` aliases over `interface` declarations unless an
  interface is required.
- Use single quotes for strings outside JSX. Use double quotes for JSX and HTML
  attributes unless that is not practical.
- Use trailing commas wherever the syntax allows them to reduce future diffs.
- Keep line width at 140 columns, not 80.
- Always use semicolons.
- Run Biome through the package scripts when editing JavaScript, TypeScript,
  JSON, or JSONC files.

## Write For The Actual Reader

Keep each artifact scoped to the reader that will actually use it:

- `README.md` is for humans adopting or understanding the repo
- `AGENTS.md`, `lotus-local/`, and `lotus-linear/` are for agents executing
  work
- keep install and adoption guidance in `README.md`, not in machine-facing
  workflow files
- keep machine-facing files operational; avoid self-descriptions and historical
  narration
- if a file is meant to be executed or followed by an agent, write only the
  rules and expectations needed at execution time

## What To Update Together

If you change naming, paths, or adoption flow, review at least:

- `README.md`
- `.codex-plugin/plugin.json`
- `lotus-local/`
- `lotus-linear/`
- any affected skill directories under those package roots

## Linear Issue Implementation Workflow

Use this workflow when a human asks you to implement a Linear issue through
GitHub PRs. It is for implementation work, not review-only or test-only tasks.

1. Read the target Linear issue, parent issue or epic, existing PR links, and
   relevant comments before changing code.
2. Start from the current default branch. Fast-forward it from origin before
   creating implementation branches.
3. Create the epic integration branch from the default branch when the issue
   belongs to an epic. If an immediate epic PR is required and the branch has no
   code changes yet, use one empty conventional commit that opens the branch.
4. Open the epic PR as a regular, non-draft PR into the default branch and link it to the epic
   issue in Linear.
5. Create the feature branch from the epic branch. Name branches from the issue
   identifier when the human provides one, but do not hardcode any specific
   issue or epic IDs into this workflow.
6. Move the Linear issue to the active implementation status before coding.
7. Commit small, coherent work ranges with English conventional commit messages
   without scopes, and push after each meaningful range.
8. Keep repository docs and agent-facing rules aligned with code changes when
   the change affects adoption flow, package usage, or workflow contracts.
9. Run the relevant checks locally before opening the feature PR.
10. Open the feature PR into the epic branch as a regular, non-draft PR, link
    it to the Linear issue, add a concise implementation summary, and move the
    issue to the review status.

## Source Of Truth For This Repo

When working in this repository, use this order:

1. explicit human instruction in the current run
2. `.local/AGENTS.md` when present
3. this `AGENTS.md`
4. `README.md`
5. the current repository state and diff

## Restrictions

- do not fabricate missing root consumer structure unless a human asks
- do not add back removed legacy docs just for explanation
- do not turn optional skills into required repository contents
- do not create automation, CI, or packaging flow unless requested
