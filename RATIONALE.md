# Lotus Agents - Rationale

## Why This Exists

Lotus Agents exists to keep human-agent collaboration stable across runs,
repositories, and levels of project maturity.

The system is trying to prevent a few recurring failures:

- agents guessing what should have been read first
- hidden precedence between docs, notes, and code
- local execution memory leaking into durable project truth
- spontaneous bootstrapping of structure that nobody explicitly asked for

## What It Protects

The contract protects four things:

1. deterministic context loading
2. explicit source-of-truth precedence
3. a clear boundary between durable knowledge and local execution memory
4. a default bias against creating new structure without human intent

## What It Refuses To Decide

Lotus Agents intentionally refuses to standardize:

- the issue tracker
- the code host
- the review tool
- the repository layout beyond configured paths
- whether a repository must use local execution memory at all

## Why Local Execution Memory Is Optional

Some repositories need resumable notes. Others do not.

Lotus Agents treats local execution memory as a tool, not as a requirement. A
repository can stay minimal until local notes become genuinely useful.

## Why Committed Docs Win

When committed docs exist, they are the shared durable truth. Allowing local
docs to compete with them would make the contract less auditable and less
portable.

That is why local-only docs are a fallback when committed docs do not exist,
not a second active docs source.
