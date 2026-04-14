# INIT CHECKLIST

This checklist is for a repository that wants to consume Lotus Agents. It is
not the bootstrap checklist for this definition repository.

1. copy the committed Lotus Agents files you want to reuse
   - `AGENTS.md`
   - `README.md`
   - `OVERVIEW.md`
   - `INTEGRATION.md`
   - `ARTIFACT_MATRIX.md`
   - `CONTRACT_CHECKLIST.md`
   - `skills/`
   - `templates/`
   - `lotus.config.yaml.example`

2. add `.local/` to `.git/info/exclude` if you want local execution memory

3. create `.local/` only if you want local execution memory

4. inside `.local/`, create only the directories you need
   - `issues/`
   - `issues-notes/`
   - `questions/`
   - `runs/`
   - `reviews/`
   - `pr-notes/`

5. optional local files
   - `.local/AGENTS.md`
   - `.local/context.md`

6. create `docs/` or `.local/docs/` only on explicit human intent
   - if you create local-only docs, mirror `specs/` and `meetings/`

7. optional
   - copy `lotus.config.yaml.example` to `lotus.config.yaml`
   - customize paths if the target repository uses different conventions
