# Example 02 - Repository With Local Execution Memory

This example shows a repository that wants resumable local notes.

```text
repo/
  AGENTS.md
  README.md
  OVERVIEW.md
  .local/
    AGENTS.md
    context.md
    issues/
    issues-notes/
    questions/
    runs/
```

Characteristics:

- `.local/` is excluded from version control
- the shared contract stays committed
- local notes exist only because a human chose to use them
- review and PR note directories can be added later if needed
