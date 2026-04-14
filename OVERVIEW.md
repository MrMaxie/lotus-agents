# Lotus Agents - Overview

## Purpose

Provide a persistent, structured, and agent-compatible workflow that:

- stabilizes AI behavior across runs
- separates raw human input from structured system truth
- enforces disciplined execution (inspired by the AAA design pattern: Arrange -> Act -> Assert)
- enables safe collaboration between human and AI

---

## Core Concepts

### 1. Two-Layer Knowledge System

- docs/meetings/* -> raw, chronological, human context (WHY)
- docs/specs/* -> structured, current expectations (WHAT & HOW)

---

### 2. Local Execution Memory

- .local/* -> ephemeral, non-committed operational memory
- used for:
  - issues
  - notes
  - runs
  - questions
  - reviews

---

### 3. AAA Execution Model

- ARRANGE -> understand context and constraints
- ACT -> perform minimal, precise work
- ASSERT -> validate and synchronize knowledge

---

### 4. Skills System

Agents operate through explicit SKILLS:

- SPEC_SYNC -> sync meetings -> specs
- COMMIT_TITLE -> generate commit titles
- PR_NOTES -> generate/update PR description
- REVIEW_PROCESS -> process review feedback
- DOCS_INIT -> bootstrap documentation
- QUESTIONS -> manage human clarification loop

---

### 5. Human-in-the-loop

- AI MUST ask questions when ambiguity exists
- questions stored in:
  - .local/questions/<issue-id>.md
  - .local/questions/<issue-id>-r<revision-index>.md
  - .local/questions/q<index>.md

---

### 6. Safety Principles

- AI NEVER pushes commits
- AI NEVER modifies meetings
- AI prefers:
  - precision > volume
  - reuse > duplication
  - consistency > novelty

---

## Entry Points

- AGENTS.md -> project-specific preferred descriptions of agent behavior
- .local/AGENTS.md -> runtime rules
- SKILLS/* -> behavior modules
- templates/* -> standardized outputs