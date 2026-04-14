#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 <destination> [minimal|with-local|custom-layout] [--force]"
}

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
source_root="$(dirname "$script_dir")"
destination="$1"
mode="${2:-minimal}"
force="false"

if [[ "${3:-}" == "--force" || "${2:-}" == "--force" ]]; then
  force="true"
fi

case "$mode" in
  minimal|with-local|custom-layout)
    ;;
  --force)
    mode="minimal"
    ;;
  *)
    usage
    exit 1
    ;;
esac

pack_entries=(
  "AGENTS.md"
  "START_HERE.md"
  "REFERENCE.md"
  "skills"
  "templates"
  "lotus.config.yaml.example"
  "lotus.config.schema.json"
  "scripts/validate-contract.ps1"
  "scripts/validate-contract.sh"
)

copy_entry() {
  local relative_path="$1"
  local source_path="$source_root/$relative_path"
  local target_path="$destination/$relative_path"

  if [[ ! -e "$source_path" ]]; then
    echo "Missing source entry: $relative_path" >&2
    exit 1
  fi

  if [[ -e "$target_path" && "$force" != "true" ]]; then
    echo "Target already exists: $target_path. Use --force to overwrite." >&2
    exit 1
  fi

  mkdir -p "$(dirname "$target_path")"

  if [[ -e "$target_path" && "$force" == "true" ]]; then
    rm -rf "$target_path"
  fi

  cp -R "$source_path" "$target_path"
}

mkdir -p "$destination"

for entry in "${pack_entries[@]}"; do
  copy_entry "$entry"
done

if [[ "$mode" == "with-local" ]]; then
  mkdir -p \
    "$destination/.local" \
    "$destination/.local/issues" \
    "$destination/.local/issues-notes" \
    "$destination/.local/questions" \
    "$destination/.local/runs"

  if [[ -e "$destination/.local/AGENTS.md" && "$force" != "true" ]]; then
    echo "Target already exists: $destination/.local/AGENTS.md. Use --force to overwrite." >&2
    exit 1
  fi

  if [[ -e "$destination/.local/context.md" && "$force" != "true" ]]; then
    echo "Target already exists: $destination/.local/context.md. Use --force to overwrite." >&2
    exit 1
  fi

  cp "$source_root/templates/local.AGENTS.example.md" "$destination/.local/AGENTS.md"
  cp "$source_root/templates/context.md" "$destination/.local/context.md"
fi

if [[ "$mode" == "custom-layout" ]]; then
  if [[ -e "$destination/lotus.config.yaml" && "$force" != "true" ]]; then
    echo "Target already exists: $destination/lotus.config.yaml. Use --force to overwrite." >&2
    exit 1
  fi

  cp "$source_root/lotus.config.yaml.example" "$destination/lotus.config.yaml"
fi

echo "Initialized Lotus Agents starter pack in $destination"
echo "Mode: $mode"
