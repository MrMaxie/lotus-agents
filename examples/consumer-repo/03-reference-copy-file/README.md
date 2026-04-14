# Example 03 - Reference Copy File

Use this when the repo already has an `AGENTS.md` and you want a small,
explicit addition.

```text
repo/
  AGENTS.md
  AGENTS_ISSUE_FLOW.md
  .local/
    context.md
    templates/
    issues/
    issues-notes/
    questions/
    reviews/
    pr-notes/
```

Copy `AGENTS_TO_COPY.md` into the target repo as `AGENTS_ISSUE_FLOW.md`.

The existing `AGENTS.md` then adds a short section telling agents to read
`AGENTS_ISSUE_FLOW.md` for `.local/`, issue, review, and resume flow rules.
