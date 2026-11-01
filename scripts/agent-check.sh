#!/usr/bin/env bash
# Claude Stop hook: lint changed files, run the tests related to them. CI runs everything.
set -uo pipefail
cd "$(dirname "$0")/.."
files=$( { git diff --name-only HEAD; git ls-files --others --exclude-standard; } \
  | grep -E '\.(js|jsx)$' | sort -u | while read -r f; do [ -f "$f" ] && echo "$f"; done)
[ -z "$files" ] && exit 0
out=$( { npx eslint $files && npx vitest related --run --passWithNoTests $files; } 2>&1 ) && exit 0
echo "money_fe check failed:" >&2
echo "$out" | tail -60 >&2
exit 2
