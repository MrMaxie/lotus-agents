# Reference Run

This example shows a fuller `.local`-first consumer repository with:

- private execution memory under `.local/`
- private helper snippets under `.local/templates/`
- optional committed docs under `docs/`
- one general run
- one issue-based run
- one review-based revision

Key points:

- `.local/` is the operational workspace
- `docs/` exists here because this repo wants committed specs and meetings
- the meetings directory intentionally contains four files so the latest three
  are the active chronological context
- review artifacts and PR notes remain optional extensions

```text
examples/reference-run/
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
  docs/
    specs/
    meetings/
```
