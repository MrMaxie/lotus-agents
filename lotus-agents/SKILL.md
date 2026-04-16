---
name: lotus-agents
description: Route Lotus workflow tasks to the right `.local` + `.docs` skill. Use when Codex needs to initialize Lotus flow, bootstrap `.docs/spec`, promote `.docs/meetings/_draft.md`, or normalize issue, PR, review, and CI work into Lotus artifacts.
---

# Lotus Agents

Use this skill as the entrypoint for the Lotus collection.

## Core Routing

- use `lotus-init` to add the base `.local` + `.docs` structure
- use `lotus-spec-init` to seed or refresh `.docs/spec/`
- use `lotus-meeting-promote` to turn `.docs/meetings/_draft.md` into a dated
  meeting file
- use `lotus-pr-intake` to collect issue, PR, review, and CI work into Lotus
  artifacts

## Operating Rules

- do not treat root `AGENTS.md` as the default Lotus adoption surface
- prefer `.local/AGENTS.md` and `.docs/AGENTS.md`
- treat `.local/` as private execution state
- treat `.docs/` as durable project guidance; whether it is committed depends on
  user intent
- do not create `AGENTS_TO_COPY.md`, `AGENTS_ISSUE_FLOW.md`, `questions`,
  `runs`, or `context.md`
- when a repo already uses Lotus, preserve its existing Lotus artifacts unless
  the human asks to reshape them

## Apply, Do Not Narrate

When the user asks for Lotus adoption or a Lotus workflow task, choose the
right skill path and perform it. Do not stop at prose instructions unless the
human explicitly asks for planning only.
