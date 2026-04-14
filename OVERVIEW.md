# Lotus Agents - Overview

Lotus Agents is a portable runtime contract for human-agent collaboration.

## It Answers Four Questions

1. what the agent reads
2. what counts as source of truth
3. where local execution memory belongs
4. when the agent must not bootstrap new structure

## Knowledge Layers

1. runtime rules
   - `AGENTS.md`
   - optional local agents file

2. durable project knowledge
   - committed docs
   - optional local-only docs when committed docs do not exist

3. local execution memory
   - issue notes
   - questions
   - run logs
   - optional review and PR note artifacts

## Run Shapes

- issue-based work
- review-based work
- general runs without an issue id

## AAA Loop

1. ARRANGE
   - resolve paths, context, docs, and task shape

2. ACT
   - make minimal changes and write only the artifacts implied by the task

3. ASSERT
   - validate behavior and reconcile durable knowledge when it drifts

## Non-Goals

Lotus Agents does not require:

- a specific issue tracker
- a specific review host
- a fixed repository structure
- durable docs in every repository
