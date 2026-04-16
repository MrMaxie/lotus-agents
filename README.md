# Lotus Agents

<p align="center">
  <img src="./assets/logo.webp" alt="Lotus Agents logo" width="220">
</p>

Small `.local` + `.docs` workflow for human-agent work.

- root-level installable skills
- one entrypoint skill: `$lotus-agents`
- task skills: `$lotus-init`, `$lotus-spec-init`, `$lotus-meeting-promote`,
  `$lotus-pr-intake`
- `.local/` holds private execution state
- `.docs/` holds project truth and may be committed or kept local
- no setup scripts
- no path configuration
- no `AGENTS_TO_COPY.md`, `AGENTS_ISSUE_FLOW.md`, `questions`, `runs`, or
  `context.md`

## Why This Exists

Most agent setups fail in the same predictable ways:

- the agent guesses what to read
- durable project truth and local scratch state mix together
- one giant skill tries to own too many workflows
- the setup encourages edits to root `AGENTS.md` even when the repo does not
  need that

Lotus Agents narrows that down to a smaller contract:

- private execution state in `.local/`
- durable project guidance in `.docs/`
- small skills for distinct tasks

## What Lives In This Repo

- `README.md`: main human entrypoint and adoption guide
- `AGENTS.md`: repo-specific instructions for agents working on Lotus Agents
- `lotus-agents/`: entrypoint skill that routes to the right Lotus workflow
- `lotus-init/`: base `.local` + `.docs` setup
- `lotus-spec-init/`: bootstrap for `.docs/spec/`
- `lotus-meeting-promote/`: promote `.docs/meetings/_draft.md` into a dated
  meeting file
- `lotus-pr-intake/`: normalize issue, PR, review, and CI work into Lotus
  artifacts
- `.codex-plugin/plugin.json`: native Codex plugin manifest

## Install

### Open Skills CLI

List the available skills:

```bash
npx skills add https://github.com/MrMaxie/lotus-agents --list
```

Install the entrypoint skill:

```bash
npx skills add https://github.com/MrMaxie/lotus-agents --skill lotus-agents
```

Install only one task-specific skill:

```bash
npx skills add https://github.com/MrMaxie/lotus-agents --skill lotus-init
```

Because each skill lives in its own root folder, you can also target a direct
skill path when that fits your installer flow better:

```bash
npx skills add https://github.com/MrMaxie/lotus-agents/tree/main/lotus-init
```

After installation, restart Codex so the new skills are picked up.

### Native Codex Plugin

This repo also ships a native Codex plugin manifest at
`.codex-plugin/plugin.json`.

Use that plugin packaging path when you want to distribute Lotus Agents through
Codex plugin surfaces instead of the open skills CLI. The workflow stays the
same; only the install surface changes.

This repo intentionally does not ship a marketplace file. Add the plugin to
your own repo or personal marketplace when you want to install it through the
plugin path.

## Skill Map

`$lotus-agents` is the entrypoint.

Use it when you want Codex to choose the right Lotus workflow and apply it
instead of only describing it.

Use the task skills directly when you already know the job:

- `$lotus-init`: add the base `.local` + `.docs` structure to a repo
- `$lotus-spec-init`: seed or refresh `.docs/spec/`
- `$lotus-meeting-promote`: turn `.docs/meetings/_draft.md` into a dated
  meeting file and reset the draft
- `$lotus-pr-intake`: pull issue, PR, review, and CI work into Lotus artifacts
  with `gh` and `acli`

Example prompts:

- `Use $lotus-init to add Lotus flow to this repo.`
- `Use $lotus-spec-init to bootstrap .docs/spec/.`
- `Use $lotus-meeting-promote to convert .docs/meetings/_draft.md into today's meeting note.`
- `Use $lotus-pr-intake to pull the current PR review and CI results into Lotus files.`

## Manual Adoption

If you do not want to install the skills, the flow stays copy-paste friendly.
Use the bundled skill assets directly.

1. Copy `lotus-init/assets/local-agents.md` to `.local/AGENTS.md`.
2. Copy `lotus-init/assets/docs-agents.md` to `.docs/AGENTS.md`.
3. Create:
   - `.local/issues/`
   - `.local/issues-notes/`
   - `.local/reviews/`
   - `.local/pr-notes/`
   - `.docs/spec/`
   - `.docs/meetings/`
   - `.docs/templates/`
4. Seed `.docs/meetings/_draft.md` from
   `lotus-init/assets/meetings-draft-template.md`.
5. Create `.docs/practices/` only when the repo wants promoted practices.
6. Add `.local/` to `.git/info/exclude` or another ignore surface.
7. Ignore `.docs/` only when you want Lotus docs to stay local-only.

## Core Shape In A Consumer Repo

```text
repo/
  .local/                     # private, local, usually ignored
    AGENTS.md
    issues/
    issues-notes/
    reviews/
    pr-notes/
  .docs/                      # required in the flow, optionally committed
    AGENTS.md
    spec/
    meetings/
      _draft.md
    templates/
    practices/                # optional
```

Rules of thumb:

- keep durable shared knowledge in `.docs/`
- keep operational scratch state in `.local/`
- do not bootstrap root `AGENTS.md` just to adopt Lotus
- do not introduce alternate folder layouts just to configure names

## What Goes In `.local/`

`.local/` is private execution state.

- `.local/AGENTS.md`: machine-local workflow rules
- `.local/issues/`: issue inputs and review-revision issue inputs
- `.local/issues-notes/`: working notes, decisions, and resume points
- `.local/reviews/`: review artifacts and proposed answers
- `.local/pr-notes/`: user-facing change summaries when needed

Use `revision-id` as `<issue-id>-r001`, `<issue-id>-r002`, and so on.

Lotus does not use:

- `.local/context.md`
- `.local/questions/`
- `.local/runs/`

When ambiguity blocks execution, ask the human. When ambiguity does not block
execution, continue with an explicit assumption and record it in the relevant
issue notes or review answers.

To keep `.local/` private, add this to `.git/info/exclude` or your repo ignore
rules:

```gitignore
.local/
```

## What Goes In `.docs/`

`.docs/` is the durable project layer.

- `.docs/AGENTS.md`: durable workflow rules for the repo
- `.docs/spec/`: expected product state, business rules, and important technical
  constraints
- `.docs/meetings/`: chronological meeting notes
- `.docs/templates/`: project-local templates that override bundled skill
  defaults
- `.docs/practices/`: optional promoted practices and meta-practices

Read relevant spec files first, then at most the latest 3 dated meeting files,
then relevant practices. Do not rewrite historical meeting files.

`_draft.md` inside `.docs/meetings/` is the working input for the next promoted
meeting note. It is not a historical record.

## Templates And Defaults

When the repo already has a relevant template in `.docs/templates/`, Lotus
skills should use it.

When the repo does not have a template yet, the skill should fall back to its
bundled asset.

The bundled defaults live inside the relevant skill directories:

- `lotus-init/assets/`
- `lotus-spec-init/assets/`
- `lotus-meeting-promote/assets/`
- `lotus-pr-intake/assets/`

## Skills

Skills are optional.

- the workflow should still make sense without them
- the entrypoint skill is `lotus-agents`
- the task skills are intentionally narrower than the old single-skill model
- reusable templates travel with the relevant skill

You do not need setup scripts, config files, or a large starter pack.
