# SKILL: DOCS_INIT

## PURPOSE

Bootstrap documentation only when a human explicitly asks for it.

## TARGETS

1. the committed docs tree rooted at `docs_root`
2. the local-only docs tree rooted at `local_docs_root`

## RULES

- do not create docs unless the human explicitly asks
- if the human says only "generate docs", default to the committed docs tree
- if the committed docs tree exists, it is the only active durable docs source
- local-only docs are a fallback only when the committed docs tree does not
  exist
- if the human explicitly asks for local-only docs and the committed docs tree
  does not exist, use `local_docs_root`
- if the human explicitly asks for local draft docs while the committed docs
  tree exists, store them under `local_root` as local artifacts and do not
  treat them as the active docs source
- if neither docs tree exists and no docs target was requested, do nothing
- when bootstrapping local-only docs, mirror the same `specs/` and `meetings/`
  semantics used by the committed docs tree

## FLOW

1. confirm the target docs location from human intent
2. analyze the codebase
3. infer durable features and domains
4. create initial specs only in the requested target
5. if ambiguity blocks the work, create a question file under `questions_dir`
   using `q<issue-id>.md`, `q<revision-id>.md`, or the next `q001.md` style
   filename
6. stop and wait only when the ambiguity blocks further work
