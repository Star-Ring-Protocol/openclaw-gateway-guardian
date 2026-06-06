<p align="center">
  <img src="assets/logo-horizontal.png" alt="OpenClaw Gateway Guardian" width="640">
</p>

<h1 align="center">OpenClaw Gateway Guardian</h1>

<p align="center"><strong>小乙-星环协议出品 / Produced by XiaoYi · Star Ring Protocol</strong></p>

OpenClaw Gateway Guardian is a lightweight reliability skill for OpenClaw operators and agent builders. It helps prevent blind gateway restarts, diagnose timeout-like failures, and stress-test agent gateway paths before a slow memory/tool route turns into a user-visible outage.

It is intentionally small: no cloud dependency, no database migration, no model key required. It reads OpenClaw status, health, task audit, stability heartbeats, logs, and local diagnostic signals, then writes structured reports under the OpenClaw workspace.

> Not a magic anti-crash patch. A practical guardrail for long-running AI agents.

## Why It Exists

AI agent gateways fail in boring but expensive ways:

- The UI says `gateway disconnected`, but the gateway process is still alive.
- A WebSocket handshake times out, but a simple health probe still works.
- A background memory/cron/model task stalls and makes the gateway look broken.
- Someone restarts the gateway while active work is still running.
- Memory search silently falls back to a degraded slow path.

Gateway Guardian separates these cases and gives the operator a safer next move.

## What It Does

- **Preflight restart guard**: blocks or warns before a risky gateway restart.
- **Watchdog**: classifies gateway state as `healthy`, `degraded`, or `critical`.
- **Diagnosis report**: captures status, health, running tasks, audit errors, stability heartbeat, process stats, and recent log evidence.
- **Dry-run restart wrapper**: shows what would happen without touching the gateway.
- **Stress training**: replays vertical scenario queries across route, semantic, vector, memory search, health, status, tasks, and audit surfaces.
- **Memory degradation detection**: flags `sqlite-vec unavailable`, degraded vector recall, stuck sessions, cron/model timeouts, and related long-tail risks.

## What It Does Not Do

- It does not guarantee upstream model providers respond.
- It does not replace OpenClaw core fixes.
- It does not provide hostile multi-tenant security.
- It does not automatically edit core config.
- It does not restart the gateway unless explicitly invoked without `--dry-run`.

## Quick Start

```sh
git clone https://github.com/YOUR_ORG/openclaw-gateway-guardian.git
cd openclaw-gateway-guardian
./install.sh
```

By default, the installer targets `~/.openclaw`. Override it with:

```sh
OPENCLAW_ROOT=/path/to/.openclaw ./install.sh
```

## Common Commands

```sh
OPENCLAW_ROOT="${OPENCLAW_ROOT:-$HOME/.openclaw}"

"$OPENCLAW_ROOT/workspace/scripts/openclaw_gateway_guard_preflight.mjs" --for restart --summary
"$OPENCLAW_ROOT/workspace/scripts/openclaw_gateway_guard_watchdog.mjs" --summary
"$OPENCLAW_ROOT/workspace/scripts/openclaw_gateway_guard_diagnose.mjs" --summary
"$OPENCLAW_ROOT/workspace/scripts/openclaw_gateway_guard_restart.mjs" --dry-run --summary
```

Stress train the gateway without performing real external actions:

```sh
"$OPENCLAW_ROOT/workspace/scripts/openclaw_gateway_guard_stress_train.mjs" --profile smoke
"$OPENCLAW_ROOT/workspace/scripts/openclaw_gateway_guard_stress_train.mjs" --profile extreme --concurrency 12
```

Reports are written to:

```text
$OPENCLAW_ROOT/workspace/diagnostics/gateway-guardian/
$OPENCLAW_ROOT/workspace/diagnostics/gateway-guardian-stress/
```

## Real Test Signal

In field testing, Gateway Guardian was exercised with synthetic workloads that mimic common long-running agent pressure patterns:

- long context handoff
- high-frequency tool probes
- memory-search-heavy retrieval
- concurrent control-plane checks
- long-running slow-path diagnosis

The point is not to expose private workload data. The point is to measure whether gateway health, status, task audit, memory/search paths, and guardian checks still behave under pressure.

That is the spirit of this skill: do not guess, measure.

## Chinese Overview / 中文简介

OpenClaw Gateway Guardian 是一个轻量级的 OpenClaw 网关加固 skill，由 **小乙-星环协议** 出品。

它不是“永不崩溃”的神奇补丁，而是一套实用的运行守护工具：在你重启 gateway 之前，它会检查是否还有任务在跑、是否有卡住的 session、是否存在 cron/model timeout、memory search 是否退化、gateway 到底是死了还是只是深层 RPC 变慢。

它适合长期运行的 AI agent 系统，尤其适合那些已经遇到过：

- TUI 显示 gateway disconnected
- handshake timeout
- tick timeout
- memory 维护任务卡住
- 后台任务超时
- memory search 变慢
- 盲目重启导致任务丢失

核心价值一句话：

> 少重启一次，少丢一次任务；早定位一次，少熬一次夜。

## Repository Layout

```text
skill/openclaw-gateway-guardian/
  SKILL.md
  references/failure_modes.md

scripts/
  openclaw_gateway_guard_lib.mjs
  openclaw_gateway_guard_preflight.mjs
  openclaw_gateway_guard_restart.mjs
  openclaw_gateway_guard_diagnose.mjs
  openclaw_gateway_guard_watchdog.mjs
  openclaw_gateway_guard_stress_train.mjs

docs/
  INTRO.en.md
  INTRO.zh-CN.md
```

## License

MIT License.

## Credit

Produced by **小乙-星环协议 / XiaoYi · Star Ring Protocol**.

Built from real OpenClaw gateway hardening work and pressure-tested against multi-scene agent workloads.
