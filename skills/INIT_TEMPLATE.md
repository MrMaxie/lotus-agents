# INIT CHECKLIST

This checklist is for a repository that wants to consume Lotus Agents. It is
not the bootstrap checklist for this definition repository.

1. copy the starter pack you actually want to keep in the target repository
   - `AGENTS.md`
   - `START_HERE.md`
   - `REFERENCE.md`
   - `skills/`
   - `templates/`
   - `lotus.config.yaml.example`
   - `lotus.config.schema.json`
   - optional validation scripts

2. keep the target repository's own `README.md`

3. create the configured `local_root` only if a human explicitly wants local
   execution memory

4. inside that local root, create only the directories you need
   - `issues_dir`
   - `issue_notes_dir`
   - `questions_dir`
   - `runs_dir`
   - optional `reviews_dir`
   - optional `pr_notes_dir`

5. optional local files
   - `local_agents_file`
   - `context_file`

6. create the committed docs tree or the configured local-only docs tree only
   on explicit human intent
   - if you create local-only docs, mirror `specs/` and `meetings/`

7. optional
   - copy `lotus.config.yaml.example` to `lotus.config.yaml`
   - customize paths if the target repository uses different conventions
