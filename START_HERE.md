# Lotus Agents - Start Here

Use this file when you want to add Lotus Agents to another repository without
replacing that repository's own documentation.

## Recommended Copy Pack

Copy these into the target repository:

- `AGENTS.md`
- `START_HERE.md`
- `REFERENCE.md`
- `skills/`
- `templates/`
- `lotus.config.yaml.example`
- `lotus.config.schema.json`
- optional `scripts/validate-contract.ps1`
- optional `scripts/validate-contract.sh`

Keep the target repository's own `README.md`.

## Choose One Adoption Mode

### 1. Minimal

Use this when the repository does not need docs bootstrap or local execution
memory yet.

Result:

- no `lotus.config.yaml`
- no local root
- the agent works from `AGENTS.md`, existing docs when present, the codebase,
  and the current diff

### 2. With Local Execution Memory

Use this when resumable local notes are worth keeping.

Result:

- create the configured `local_root`
- create only the directories you need under it
- optionally add `local_agents_file` and `context_file`

### 3. Custom Layout

Use this when the repository already has different docs or local paths.

Result:

- copy `lotus.config.yaml.example` to `lotus.config.yaml`
- map every Lotus Agents path explicitly
- keep the contract logic the same even though the directories differ

## Rules That Matter Most

- `AGENTS.md` is the only normative rules file
- committed docs outrank local-only docs whenever committed docs exist
- local-only docs are a fallback, not a second competing source of truth
- local execution memory is optional
- do not create docs or local structure unless a human explicitly wants them

## Next Steps

1. pick an adoption mode
2. adjust `AGENTS.md` only where the target repository truly differs
3. add `lotus.config.yaml` only if the defaults are wrong
4. run a validation helper if you copied one
5. point agents and humans to `REFERENCE.md` for the shared mental model
