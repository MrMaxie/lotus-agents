# Durable Agent Rules

## Durable Sources

- `.docs/spec/` holds target state, expected behavior, and important business or
  technical constraints; use `_toc.md` as the local index when a branch has
  linked subfiles
- `.docs/meetings/` holds chronological meeting notes; `_draft.md` is working
  input until promotion
- `.docs/templates/` holds project-specific templates that override bundled
  skill defaults when relevant
- `.docs/practices/` is optional and holds promoted engineering or meta
  practices when the project uses them; use `_toc.md` as the local index when a
  branch has linked subfiles

## Working Rules

- prefer durable project truth in `.docs/spec/` or `.docs/practices/`, not in
  `.local/`
- when entering `.docs/spec/` or `.docs/practices/`, read `_toc.md` first when
  present, then follow the linked leaf files that matter
- prefer small named docs with explicit titles and tight scope when a topic
  naturally decomposes
- cross-link related entities, terms, flows, and files so important names keep
  context across the tree
- keep generated durable docs concise and in English
- call out code-facing names exactly as used in the codebase and state what
  context they belong to
- read relevant spec files first, then at most the latest 3 dated meeting files
- never rewrite historical meeting files
- create new dated meeting files instead of mutating old ones
- do not invent `.docs/practices/` content when the folder is absent
- do not treat `.docs/meetings/` as a `_toc.md` branch; keep meetings
  chronological
- when a relevant template exists in `.docs/templates/`, prefer it over bundled
  skill defaults
- when `.local/AGENTS.md` and `.docs/AGENTS.md` conflict, explicit human
  instruction wins, then `.local/AGENTS.md`
