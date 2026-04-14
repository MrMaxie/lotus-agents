# Feature: Search

## Purpose

Provide a predictable repository search flow with query suggestions and stable
result ordering.

## Behavior

- empty input keeps the last confirmed query until the user clears it
- confirmed queries use exact repository filters when they are available
- search results are ordered by relevance first and recency second

## Constraints

- repository-wide defaults come from committed specs, not local notes
- local drafts must not override committed docs when committed docs exist

## Edge Cases

- ambiguous repository identifiers require clarification before execution
- empty results are valid and should not create new repository structure

## Technical Notes

- issue inference may come from branch naming when it is unambiguous

## Deprecated

- sorting by modification time alone
