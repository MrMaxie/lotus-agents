# Durable Agent Rules

## Durable Sources

- `.docs/spec/` holds target state, expected behavior, and important business or
  technical constraints
- `.docs/meetings/` holds chronological meeting notes; `_draft.md` is working
  input until promotion
- `.docs/templates/` holds project-specific templates that override bundled
  skill defaults when relevant
- `.docs/practices/` is optional and holds promoted engineering or meta
  practices when the project uses them

## Working Rules

- prefer durable project truth in `.docs/spec/` or `.docs/practices/`, not in
  `.local/`
- read relevant spec files first, then at most the latest 3 dated meeting files
- never rewrite historical meeting files
- create new dated meeting files instead of mutating old ones
- do not invent `.docs/practices/` content when the folder is absent
- when a relevant template exists in `.docs/templates/`, prefer it over bundled
  skill defaults
- when `.local/AGENTS.md` and `.docs/AGENTS.md` conflict, explicit human
  instruction wins, then `.local/AGENTS.md`
