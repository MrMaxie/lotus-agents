---
name: lotus-linear-agents
description: Route Linear-backed Lotus workflow tasks to the right skill. Use when Codex needs to initialize or operate a repository where Linear is the operational and durable project source.
---

# Lotus Linear Agents

Use this skill as the entrypoint for the Linear-backed Lotus variant.

## Core Routing

- use `lotus-linear-init` to add the base `.local/AGENTS.md` rules for
  Linear-backed work
- use `lotus-linear-intake` to collect issue, PR, review, and CI work into
  Linear issues, comments, documents, and status context
- use the local-first `lotus-agents` or `lotus-pr-intake` only when the human
  explicitly wants file-backed operational artifacts

## Operating Model

- treat Linear as the canonical operational state for active work
- treat `.local/` as private configuration, workflow notes, and reproduction
  notes only
- treat `.docs/` as repository guidance when the repo keeps shared specs,
  templates, or durable instructions near the code
- treat configured Linear issues and comments as the active operational state
- read project-specific Linear routing from `.local/AGENTS.md` before using
  Linear: `linear_team`, `linear_project`, `linear_flow_document`,
  `source_policy`, and `external_writes`
- use external systems such as Jira, GitHub, Azure DevOps, or Confluence as
  read-only source surfaces unless the human explicitly authorizes an external
  write
- when a remote ticket or remote PR comment is cloned into Linear, keep the
  exact source identifier and URL in the Linear record
- keep all generated operational text concise, technical, and in English
- never say in Linear artifacts that the agent is "working in Lotus"

## Linear Requirement

The Linear connector is required for active Linear-backed intake. If Linear
tools are missing, or the available connector session cannot resolve the target
issue/project context needed for the requested action, stop before claiming the
workflow is ready and ask the human to connect Linear or provide the missing
target context.

## Apply, Do Not Narrate

When the user asks for Linear-backed Lotus adoption or intake, choose the right
skill path and perform it. Do not stop at prose instructions unless the human
explicitly asks for planning only.
