#!/usr/bin/env bash
set -euo pipefail

root="${1:-$(dirname "$(dirname "$0")")}"
failures=()

add_failure() {
  failures+=("$1")
}

assert_exists() {
  local relative_path="$1"
  local label="$2"
  if [[ ! -e "$root/$relative_path" ]]; then
    add_failure "$label is missing: $relative_path"
  fi
}

required_entries=(
  "AGENTS.md:Contract"
  "START_HERE.md:Starter guide"
  "REFERENCE.md:Secondary reference"
  "skills:Skills directory"
  "templates:Templates directory"
  "lotus.config.yaml.example:Config example"
  "lotus.config.schema.json:Config schema"
)

for entry in "${required_entries[@]}"; do
  path="${entry%%:*}"
  label="${entry##*:}"
  assert_exists "$path" "$label"
done

template_files=(
  "templates/context.md"
  "templates/issue.md"
  "templates/issue-notes.md"
  "templates/local.AGENTS.example.md"
  "templates/meeting.md"
  "templates/pr-notes.md"
  "templates/questions.issue.md"
  "templates/questions.runtime.md"
  "templates/review.md"
  "templates/review-answers.md"
  "templates/run.md"
  "templates/spec.feature.md"
)

for template_file in "${template_files[@]}"; do
  assert_exists "$template_file" "Template"
done

expected_keys=(
  "docs_root"
  "specs_dir"
  "meetings_dir"
  "local_root"
  "local_agents_file"
  "context_file"
  "local_docs_root"
  "local_specs_dir"
  "local_meetings_dir"
  "issues_dir"
  "issue_notes_dir"
  "questions_dir"
  "runs_dir"
  "reviews_dir"
  "pr_notes_dir"
  "default_branch"
)

for key in "${expected_keys[@]}"; do
  if ! grep -qE "^${key}:" "$root/lotus.config.yaml.example"; then
    add_failure "Config example is missing key: $key"
  fi

  if ! grep -q "\"${key}\"" "$root/lotus.config.schema.json"; then
    add_failure "Config schema is missing key: $key"
  fi
done

while IFS= read -r -d '' skill_file; do
  if grep -qE '\.local/|\bdocs/' "$skill_file"; then
    add_failure "Hardcoded default path found in skill: $(basename "$skill_file")"
  fi
done < <(find "$root/skills" -maxdepth 1 -type f -name '*.md' -print0)

if [[ ${#failures[@]} -gt 0 ]]; then
  echo "Lotus Agents contract validation failed:"
  for failure in "${failures[@]}"; do
    echo " - $failure"
  done
  exit 1
fi

echo "Lotus Agents contract validation passed."
