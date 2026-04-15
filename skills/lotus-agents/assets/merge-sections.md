# Merge Scope For Existing `AGENTS.md`

When the target repo already has an `AGENTS.md` and the user wants a direct
merge, bring over only the Lotus issue-flow rules that matter:

- read order and source-of-truth rules
- fixed `.local/` and `docs/` path conventions
- issue, review, question, run, and PR-notes artifact naming
- docs rules for `docs/specs/` and `docs/meetings/`
- working rules about assumptions, durable truth, and `.local/` scope

Do not copy README-style narration into the host repo's machine-facing files.
Prefer a minimal merge that preserves the host repository's existing contract.
