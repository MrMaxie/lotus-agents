# Lotus Agents

Small `.local`-first issue flow for human-agent work.

- one main installable skill: `$lotus-agents`
- native Codex plugin packaging for the same skill
- `AGENTS_TO_COPY.md` remains the human copy/merge helper
- `.local/` holds private execution state
- `docs/` is optional and committed durable truth
- no setup scripts
- no path config

## Why This Exists

Most agent setups fail in the same boring ways:

- the agent guesses what to read
- scratch notes leak into durable project truth
- every repo invents a different place for issue notes and review notes
- onboarding starts with tooling instead of a simple copy-paste flow

Lotus Agents narrows that down to one convention.

## What Lives In This Repo

- `README.md`: main human entrypoint and adoption guide
- `AGENTS.md`: repo-specific instructions for agents working on Lotus Agents
- `AGENTS_TO_COPY.md`: human-facing copy/merge helper for consumer repos
- `skills/lotus-agents/`: the main installable skill package
- `.codex-plugin/plugin.json`: native Codex plugin manifest bundling
  `./skills/`

The root `AGENTS_TO_COPY.md` mirrors
`skills/lotus-agents/assets/AGENTS_TO_COPY.md`. When the flow changes, update
both copies together.

## Install

### Open Skills CLI

Install the repo as a skill collection and pull in the main entrypoint skill:

```bash
npx skills add https://github.com/MrMaxie/lotus-agents --skill lotus-agents
```

After installation, restart Codex so the new skill is picked up.

> [!TIP]
> If `$lotus-agents` does not appear where you expect it, the installer may
> have targeted a different agent or only the current repo. In that case, rerun
> the install with explicit Codex and global flags so the skill is available to
> Codex across repositories.

### Native Codex Plugin

This repo also ships a native Codex plugin manifest at
`.codex-plugin/plugin.json`.

Use that plugin packaging path when you want to distribute Lotus Agents through
Codex plugin surfaces instead of the open skills CLI. The manifest bundles the
same `./skills/` directory, so the install surface changes without changing the
workflow itself.

This repo intentionally does not ship a marketplace file. Add the plugin to
your own repo or personal marketplace when you want to install it through the
plugin path.

## Use The Skill

`$lotus-agents` is the main entrypoint.

Use it when you want Codex to:

- add the Lotus Agents flow to a repo with no `AGENTS.md`
- merge the flow into an existing `AGENTS.md`
- install the flow as `AGENTS_ISSUE_FLOW.md` and wire a reference into the
  existing `AGENTS.md`
- work inside a repo that already uses the Lotus `.local` issue flow
- bootstrap `.local/pr-notes/<id>.md` from the bundled template

Example prompts:

- `Use $lotus-agents to add the Lotus Agents flow to this repo.`
- `Use $lotus-agents to merge the Lotus issue flow into my existing AGENTS.md.`
- `Use $lotus-agents to install the flow as AGENTS_ISSUE_FLOW.md and update AGENTS.md.`
- `Use $lotus-agents to draft .local/pr-notes/123.md from the template.`

## Manual Adoption

If you do not want to install the skill, the flow stays copy-paste friendly.
Use `AGENTS_TO_COPY.md` directly.

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
- `.local/issues/`: issue inputs for both `issue-id` and `revision-id`
- `.local/issues-notes/`: working notes and decisions for both `issue-id` and
  `revision-id`
- `.local/questions/`: unanswered human questions, including `q<revision-id>.md`
  for blocking review questions
- `.local/runs/`: non-issue run logs
- `.local/reviews/`: review artifacts
- `.local/pr-notes/`: user-facing change summary drafts

Reusable templates are not part of the default `.local` contract. When a
template should travel with a workflow, keep it as an asset of an optional
skill so it can be installed together with that skill.

If a repo does not have `.local/` yet, do not invent it by surprise. Create it
when the human wants the flow.

When non-blocking ambiguity appears, continue with an explicit assumption. Record
that assumption in local notes only when `.local/` already exists. If `.local/`
is absent by design, keep the assumption in the working response, handoff, or
issue summary instead of bootstrapping private files just to store it.

To keep it private, add this to `.git/info/exclude` or your repo ignore rules:

```gitignore
.local/
```

## What Goes In `docs/`

`docs/` is optional. Use it only for committed, shared truth.

- `docs/specs/`: durable behavior and expectations
- `docs/meetings/`: chronological context

Agent rule: read specs when `docs/specs/` exists, then at most the latest 3
meeting files when `docs/meetings/` exists. Never rewrite meeting files.

`SPEC_SYNC` is an optional example workflow for repos that keep durable
expectations in `docs/specs/`. If those durable docs do not exist, the skill is
not applicable and should not create `docs/` or guess missing spec sources.

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
# Issue - <artifact-id>

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

Here, `<artifact-id>` means either `<issue-id>` or `<revision-id>`. For a
review revision issue, that means a file such as `.local/issues/123-r001.md`
with the heading `# Issue - 123-r001`.

`.local/issues-notes/<issue-id>.md` or `.local/issues-notes/<revision-id>.md`:

```md
# Issue Notes - <artifact-id>

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

Here, `<artifact-id>` means either `<issue-id>` or `<revision-id>`. For a
review revision notes file, that means
`.local/issues-notes/123-r001.md` with the heading
`# Issue Notes - 123-r001`.

`.local/questions/q<issue-id>.md`, `.local/questions/q<revision-id>.md`, or
`.local/questions/q001.md`:

```md
# Questions - q<file-key>

Examples: `q123`, `q123-r001`, `q001`

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

- the flow should still make sense without them
- this repo now ships one main installable skill: `lotus-agents`
- the skill carries reusable templates and adoption assets with it
- the human fallback remains `AGENTS_TO_COPY.md`

## What To Copy From This Repo

Usually one of these:

- install `$lotus-agents` and let it apply the right scenario
- `AGENTS_TO_COPY.md` copied as `AGENTS.md`
- selected sections merged into an existing `AGENTS.md`
- `AGENTS_TO_COPY.md` copied as `AGENTS_ISSUE_FLOW.md` and referenced from an
  existing `AGENTS.md`

You do not need setup scripts, config files, or a large starter pack.
