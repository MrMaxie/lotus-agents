# Reference Run

This example shows one default-layout consumer repository with:

- committed docs
- local execution memory
- one general run
- one issue-based run
- one review-based revision

Key points:

- `docs/` is the active docs source because committed docs exist
- `.local/` contains execution memory and local overrides only
- the meetings directory intentionally contains four files so the latest three
  are the active chronological context
- review artifacts use the same canonical shape as the templates and skills

```text
examples/reference-run/
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
