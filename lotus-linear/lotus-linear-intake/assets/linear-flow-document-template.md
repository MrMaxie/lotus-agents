# Linear Project Flow

## Project Configuration
- Linear Team: <team-key-or-name>
- Linear Project: <project-name-or-id>
- Flow Document: <document-title-or-id>
- Source Policy: <local-only|remote-read-through|remote-clone>
- External Writes: disallowed-by-default

## Source Systems
- Local: tasks created directly by the human or agent; no external source link
  applies
- Remote Ticket: cloned from Jira, Azure DevOps, GitHub Issues, or another
  tracker; requires exact source ID, URL, and `Remote Ticket` tag
- Remote PR Review: cloned from a PR review/comment; requires PR URL and comment
  permalink or comment ID

## Read/Write Policy
- Write operational state to Linear issues, comments, documents, and status
  updates
- Read external systems only when needed for source freshness or project rules
- Do not write to external systems without explicit human authorization for the
  target and action

## Recurring Hygiene
- Keep active tasks assigned to the configured project
- Use cycles when the project already uses cycles
- Refresh remote-sourced tasks before replying externally or closing them
- Add progress comments when work pauses, resumes, blocks, or becomes ready for
  review

## Agent Starting Point
1. Read `.local/AGENTS.md`
2. Read this document
3. Inspect the target Linear issue or project
4. Inspect relevant Linear project resources, files, documents, issues, and
   comments
5. Read external sources only when required by policy or missing context
