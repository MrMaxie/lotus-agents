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

Install the main skill:

```bash
npx skills add https://github.com/MrMaxie/lotus-agents --skill lotus-agents
```

If you want to set up the repository immediately:

```bash
npx skills add https://github.com/MrMaxie/lotus-agents --skill lotus-init
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

## Which Skills To Use

- `$lotus-agents`:
  entrypoint when you want Codex to choose the right Lotus flow
- `$lotus-init`:
  creates the base `.local/` and `.docs/` layout
- `$lotus-spec-init`:
  starts `.docs/spec/`
- `$lotus-meeting-promote`:
  turns `.docs/meetings/_draft.md` into a structured meeting note
- `$lotus-pr-intake`:
  collects issue, PR, review, and CI work into Lotus artifacts

If you are not sure where to start, begin with `$lotus-agents` or
`$lotus-init`.

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
