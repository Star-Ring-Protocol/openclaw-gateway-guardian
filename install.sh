#!/usr/bin/env bash
set -euo pipefail

ROOT="${OPENCLAW_ROOT:-$HOME/.openclaw}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

mkdir -p "$ROOT/workspace/skills/openclaw-gateway-guardian/references"
mkdir -p "$ROOT/workspace/scripts"

cp "$HERE/skill/openclaw-gateway-guardian/SKILL.md" \
  "$ROOT/workspace/skills/openclaw-gateway-guardian/SKILL.md"

cp "$HERE/skill/openclaw-gateway-guardian/references/failure_modes.md" \
  "$ROOT/workspace/skills/openclaw-gateway-guardian/references/failure_modes.md"

cp "$HERE"/scripts/openclaw_gateway_guard_*.mjs \
  "$ROOT/workspace/scripts/"

chmod +x "$ROOT"/workspace/scripts/openclaw_gateway_guard_*.mjs

echo "Installed OpenClaw Gateway Guardian into: $ROOT"
echo "Try:"
echo "  $ROOT/workspace/scripts/openclaw_gateway_guard_preflight.mjs --for restart --summary"
echo "  $ROOT/workspace/scripts/openclaw_gateway_guard_watchdog.mjs --summary"
