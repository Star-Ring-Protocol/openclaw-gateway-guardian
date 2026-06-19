#!/usr/bin/env bash
set -euo pipefail

ROOT="${OPENCLAW_ROOT:-$HOME/.openclaw}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

mkdir -p "$ROOT/workspace/scripts"

for skill_dir in "$HERE"/skill/*; do
  [ -d "$skill_dir" ] || continue
  skill_name="$(basename "$skill_dir")"
  mkdir -p "$ROOT/workspace/skills/$skill_name"
  cp "$skill_dir/SKILL.md" "$ROOT/workspace/skills/$skill_name/SKILL.md"
  if [ -d "$skill_dir/references" ]; then
    mkdir -p "$ROOT/workspace/skills/$skill_name/references"
    cp "$skill_dir"/references/* "$ROOT/workspace/skills/$skill_name/references/"
  fi
done

cp "$HERE"/scripts/openclaw_gateway_guard_*.mjs \
  "$ROOT/workspace/scripts/"

chmod +x "$ROOT"/workspace/scripts/openclaw_gateway_guard_*.mjs

echo "Installed OpenClaw Gateway Guardian into: $ROOT"
echo "Installed skills:"
find "$ROOT/workspace/skills" -maxdepth 1 -mindepth 1 -type d -print | sed "s#^#  #"
echo "Try:"
echo "  $ROOT/workspace/scripts/openclaw_gateway_guard_preflight.mjs --for restart --summary"
echo "  $ROOT/workspace/scripts/openclaw_gateway_guard_watchdog.mjs --summary"
