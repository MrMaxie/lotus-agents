# Lotus Agents

Small copy-paste issue flow for human-agent work.

- `.local/` holds private execution state
- `docs/` is optional and committed when the repo wants durable shared docs
- `AGENTS.md` in this repo explains the project to agents working here
- `AGENTS_TO_COPY.md` is the flow artifact you copy into consumer repos
- no setup scripts
- no path config
- no required skills inside the repo

## Why This Exists

Most agent setups fail in the same boring ways:

- the agent guesses what to read
- scratch notes leak into durable project truth
- every repo invents a different place for issue notes and review notes
- onboarding starts with tooling instead of a simple copy-paste flow

Lotus Agents narrows that down to one convention.

## What Lives In This Repo

- `README.md`: main human entrypoint, adoption guide, and starter snippets
- `AGENTS.md`: repo-specific instructions for agents working on Lotus Agents
- `AGENTS_TO_COPY.md`: the file meant for copy/merge/reference in other repos
- `skills/`: optional example skills

## Core Shape In A Consumer Repo

```text
repo/
  AGENTS.md
  AGENTS_ISSUE_FLOW.md        # optional if AGENTS already exists
  docs/                       # optional, committed
    specs/
    meetings/
  .local/                     # private, local, usually ignored
    AGENTS.md                 # optional machine-local overrides
    context.md
    templates/
    issues/
    issues-notes/
    questions/
    runs/
    reviews/
    pr-notes/
```

Rules of thumb:

- create only the `.local/` subdirectories you actually use
- keep durable shared knowledge in `docs/`
- keep operational scratch state in `.local/`
- do not introduce alternate folder layouts just to "configure" names

## Three Adoption Paths

### 1. Repo Has No `AGENTS.md`

Use `AGENTS_TO_COPY.md` as the base.

1. Copy `AGENTS_TO_COPY.md` into the target repo.
2. Rename it to `AGENTS.md`.
3. Create `.local/` and the subdirectories you need.
4. Add `docs/` only if you want committed specs or meetings.

Minimal shape:

```text
repo/
  AGENTS.md
  .local/
    context.md
    templates/
    issues/
    issues-notes/
```

### 2. Repo Already Has `AGENTS.md` And You Can Edit It

Keep the existing file and merge in the parts you want from
`AGENTS_TO_COPY.md`.

Usually that means copying only:

- read order and source-of-truth rules
- `.local/` conventions
- issue and review artifact naming
- docs rules

### 3. Repo Already Has `AGENTS.md` And You Want Small Changes

Keep the existing `AGENTS.md`, copy `AGENTS_TO_COPY.md` into the repo as
`AGENTS_ISSUE_FLOW.md`, and add a short reference section.

Paste this into the existing `AGENTS.md`:

```md
## Additional Issue Flow

This repository also uses the workflow rules in `AGENTS_ISSUE_FLOW.md`.

When work touches planning, `.local/` artifacts, issue notes, review notes,
questions, or resume flow, read and follow `AGENTS_ISSUE_FLOW.md` together with
this file.

If the files conflict, this `AGENTS.md` wins unless it explicitly says
otherwise.
```

## Fuller `.local`-First Shape

A repo that leans fully into the flow often grows into this shape:

```text
repo/
  AGENTS.md
  AGENTS_ISSUE_FLOW.md        # optional when AGENTS already exists
  docs/
    specs/
    meetings/
  .local/
    AGENTS.md
    context.md
    templates/
    issues/
    issues-notes/
    questions/
    runs/
    reviews/
    pr-notes/
```

Use that fuller shape only when the repo actually needs it.

For review-based work, `revision-id` means `<issue-id>-r001`, `<issue-id>-r002`,
and so on. When local execution memory is in use, review revisions can create
both review artifacts and issue-style artifacts keyed by that `revision-id`.

- `.local/context.md` carries resume hints and machine-local constraints
- `.local/issues/` and `.local/issues-notes/` separate requested work from
  working notes for both issue ids and review revision ids
- `.local/questions/` groups human clarifications without polluting durable docs
- `.local/runs/` supports non-issue work
- `.local/reviews/` and `.local/pr-notes/` stay optional until review flow or
  user-facing summaries matter
- `docs/specs/` holds durable expectations; `docs/meetings/` holds
  chronological context

## What Goes In `.local/`

`.local/` is the main entrypoint of the idea. It is where private execution
state belongs.

- `.local/AGENTS.md`: machine-local overrides only
- `.local/context.md`: resume hints and local context
- `.local/templates/`: private helper snippets
- `.local/issues/`: issue inputs for both `issue-id` and `revision-id`
- `.local/issues-notes/`: working notes and decisions for both `issue-id` and
  `revision-id`
- `.local/questions/`: unanswered human questions, including `q<revision-id>.md`
  for blocking review questions
- `.local/runs/`: non-issue run logs
- `.local/reviews/`: review artifacts
- `.local/pr-notes/`: user-facing change summary drafts

If a repo does not have `.local/` yet, do not invent it by surprise. Create it
when the human wants the flow.

To keep it private, add this to `.git/info/exclude` or your repo ignore rules:

```gitignore
.local/
```

## What Goes In `docs/`

`docs/` is optional. Use it only for committed, shared truth.

- `docs/specs/`: durable behavior and expectations
- `docs/meetings/`: chronological context

Agent rule: read specs, then at most the latest 3 meeting files. Never rewrite
meeting files.

## Optional Local File Starters

These are private helper patterns, not committed source of truth.

`.local/context.md`:

```md
# Local Context

## Stable Context
- ...

## Local Constraints
- ...

## Active Workstreams
- ...

## Resume Hints
- ...
```

`.local/issues/<issue-id>.md` or `.local/issues/<revision-id>.md`:

```md
# Issue - <issue-id>

## Goal
...

## Background
...

## Constraints
- ...

## Acceptance Criteria
- ...

## Open Questions
- ...
```

Use the same structure for a review revision issue such as
`.local/issues/123-r001.md`.

`.local/issues-notes/<issue-id>.md` or `.local/issues-notes/<revision-id>.md`:

```md
# Issue Notes - <issue-id>

## Goal
...

## Context
- ...

## Progress
- ...

## Outputs
- ...

## Decisions and Assumptions
- ...

## Open Questions
- ...

## Resume Point
...
```

Use the same structure for a review revision notes file such as
`.local/issues-notes/123-r001.md`.

`.local/questions/q<id>.md`:

```md
# Questions - q<id>

## q1

### Question
...

### Answer
...
```

`.local/reviews/<revision-id>.md`:

```md
# Review - <revision-id>

## Source
...

## Scope
...

## New Comments

### c1
...
```

`.local/reviews/<revision-id>-answers.md`:

```md
# Review Answers - <revision-id>

## c1

### Proposed Reply
...

### Fix Notes
- ...
```

Blocking questions for a review revision go in
`.local/questions/q<revision-id>.md`.

`.local/runs/001.md`:

```md
# Run 001

## Goal
...

## Context
- ...

## Actions
- ...

## Outputs
- ...

## Decisions and Assumptions
- ...

## Open Questions
- ...

## Resume Point
...
```

`.local/pr-notes/<id>.md`:

```md
# PR Notes - <id>

## Summary
...

## User-Visible Changes
- ...

## Relevant Refactors
- ...

## Risks and Follow-Ups
- ...
```

## Skills

Skills are optional.

- they can live in the repo
- they can be installed on the machine instead
- the flow should still make sense without them

This repo keeps a few example skills, but they are not part of the required
copy pack.

### Install A Skill In Codex

Codex looks for skills under `$CODEX_HOME/skills/<skill-name>/SKILL.md`.

PowerShell example:

```powershell
New-Item -ItemType Directory -Force "$env:CODEX_HOME\\skills\\questions" | Out-Null
Copy-Item ".\\skills\\QUESTIONS.md" "$env:CODEX_HOME\\skills\\questions\\SKILL.md"
```

Bash example:

```bash
mkdir -p "$CODEX_HOME/skills/questions"
cp ./skills/QUESTIONS.md "$CODEX_HOME/skills/questions/SKILL.md"
```

Repeat the same pattern for any other skill file:

- choose a folder name under `$CODEX_HOME/skills/`
- copy the chosen file there as `SKILL.md`

## What To Copy From This Repo

Usually one of these:

- `AGENTS_TO_COPY.md`
- selected sections merged into an existing `AGENTS.md`
- optional skill files if you want repo-local skills

You do not need setup scripts, config files, or a large starter pack.
