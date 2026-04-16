# Lotus Agents

<p align="center">
  <img src="./assets/logo.webp" alt="Lotus Agents logo" width="220">
</p>

Lotus Agents is a simple way to structure human-agent work in a repository.
Instead of putting everything in one place, it separates private working notes
from durable project guidance:

- `.local/` for the agent's local working state
- `.docs/` for project knowledge worth keeping

## Quick Start

Install the main routing skill:

```bash
npx skills@latest add MrMaxie/lotus-agents --skill lotus-agents
```

If you want to set up the repository immediately:

```bash
npx skills@latest add MrMaxie/lotus-agents --skill lotus-init
```

Restart Codex after installation.

The repository also exposes a native plugin manifest in
`.codex-plugin/plugin.json` if you prefer that installation path.

## How It Works

The model is intentionally small:

```text
repo/
  .local/
    AGENTS.md
    issues/
    issues-notes/
    reviews/
    pr-notes/
  .docs/
    AGENTS.md
    spec/
    meetings/
      _draft.md
    templates/
    practices/   # optional
```

`.local/` is the private working layer. It should usually be ignored by Git.

`.docs/` is the project layer. Keep specs, meeting notes, and reusable patterns
there. You can commit it or keep it local-only, depending on how you want to
run the project.

## Installable Skills

- **`lotus-agents`** - entrypoint skill that routes Lotus work to the right
  flow: setup, spec bootstrap, meeting promotion, or PR/review/CI intake.

  ```sh
  npx skills@latest add MrMaxie/lotus-agents --skill lotus-agents
  ```

  ```sh
  # Example prompts for the agent
  "Use $lotus-agents and initialize the Lotus workflow in this repo."
  "Use $lotus-agents and bootstrap .docs/spec for the current project."
  "Use $lotus-agents and pull this PR review into Lotus artifacts."
  ```

- **`lotus-init`** - creates the base `.local/` + `.docs/` structure, seeds
  `.local/AGENTS.md`, `.docs/AGENTS.md`, and `.docs/meetings/_draft.md`, and
  applies ignore rules for `.local/` plus optional local-only `.docs/`.

  ```sh
  npx skills@latest add MrMaxie/lotus-agents --skill lotus-init
  ```

  ```sh
  # Example prompts for the agent
  "Use $lotus-init in this repo. Keep .docs committed."
  "Use $lotus-init here, but keep .docs local-only for now and ignore it too."
  "Use $lotus-init and create .docs/practices as well."
  ```

- **`lotus-spec-init`** - bootstraps or refreshes `.docs/spec/` with the first
  durable target-state spec or another Lotus-style spec starter.

  ```sh
  npx skills@latest add MrMaxie/lotus-agents --skill lotus-spec-init
  ```

  ```sh
  # Example prompts for the agent
  "Use $lotus-spec-init and create the first target-state spec for this repo."
  "Use $lotus-spec-init and follow the existing naming pattern in .docs/spec."
  "Use $lotus-spec-init, but prefer the local .docs/templates/spec.md template."
  ```

- **`lotus-meeting-promote`** - turns `.docs/meetings/_draft.md` into a dated
  meeting note, keeps decisions and follow-ups explicit, and resets the draft
  template afterward.

  ```sh
  npx skills@latest add MrMaxie/lotus-agents --skill lotus-meeting-promote
  ```

  ```sh
  # Example prompts for the agent
  "Use $lotus-meeting-promote and promote the current draft meeting notes."
  "Use $lotus-meeting-promote. If the date or participants are unclear, ask me."
  "Use $lotus-meeting-promote and keep the existing meeting filename pattern."
  ```

- **`lotus-pr-intake`** - gathers issue, PR, review, and CI work into Lotus
  artifacts under `.local/issues/`, `.local/issues-notes/`, `.local/reviews/`,
  and `.local/pr-notes/`.

  ```sh
  npx skills@latest add MrMaxie/lotus-agents --skill lotus-pr-intake
  ```

  ```sh
  # Example prompts for the agent
  "Use $lotus-pr-intake for PR #123 and prepare the Lotus artifacts."
  "Use $lotus-pr-intake for issue #456 and record assumptions in issue notes."
  "Use $lotus-pr-intake for this failed CI run and write PR notes for the user-facing changes."
  ```

If you are not sure where to start, install `lotus-agents` first and route
through `$lotus-agents`.

## Manual Adoption

If you do not want to install the skills, you can adopt Lotus manually:

1. copy `lotus-init/assets/local-agents.md` to `.local/AGENTS.md`
2. copy `lotus-init/assets/docs-agents.md` to `.docs/AGENTS.md`
3. create these directories:
   - `.local/issues/`
   - `.local/issues-notes/`
   - `.local/reviews/`
   - `.local/pr-notes/`
   - `.docs/spec/`
   - `.docs/meetings/`
   - `.docs/templates/`
4. create `.docs/meetings/_draft.md` from
   `lotus-init/assets/meetings-draft-template.md`
5. add `.local/` to `.git/info/exclude` or `.gitignore`
6. decide whether `.docs/` should be committed or local-only

## What Is In This Repo

The most important pieces are:

- `README.md`:
  the main human entrypoint
- `AGENTS.md`:
  working rules for this repository
- `lotus-*/`:
  the actual skills and their assets

If you want the details, read:

- `AGENTS.md` for repository rules
- `lotus-*/SKILL.md` for the behavior of each skill
