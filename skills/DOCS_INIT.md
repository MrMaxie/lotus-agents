# SKILL: DOCS_INIT

## PURPOSE

Bootstrap documentation only when a human explicitly asks for it.

## TARGETS

1. `docs/`
2. `.local/docs/`

## RULES

- do not create docs unless the human explicitly asks
- if the human says only "generate docs", default to `docs/`
- if the human explicitly asks for local-only docs, use `.local/docs/`
- if `docs/` exists, ignore `.local/docs/`
- if `docs/` does not exist but `.local/docs/` exists, use `.local/docs/`
- if neither exists and no docs target was requested, do nothing
- when bootstrapping local-only docs, mirror the same `specs/` and `meetings/`
  semantics used by the committed docs tree

## FLOW

1. confirm the target docs location from human intent
2. analyze the codebase
3. infer durable features and domains
4. create initial specs only in the requested target
5. if ambiguity blocks the work, create a question file under `.local/questions/`
   using `q<issue-id>.md` or the next `q001.md` style filename
6. stop and wait only when the ambiguity blocks further work
