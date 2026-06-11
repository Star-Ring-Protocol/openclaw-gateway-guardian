<p align="center">
  <img src="assets/logo-horizontal.png" alt="OpenClaw Gateway Guardian" width="640">
</p>

<h1 align="center">OpenClaw Gateway Guardian</h1>

<p align="center"><strong>小乙-星环协议出品 / Produced by XiaoYi · Star Ring Protocol</strong></p>

OpenClaw Gateway Guardian is a small reliability toolkit for OpenClaw operators and agent gateway maintainers. It checks restart risk, captures gateway evidence, and runs bounded synthetic pressure tests against health, status, task, audit, and memory-search paths.

It has no cloud dependency, database migration, or model key requirement. It reads local OpenClaw signals and writes structured reports under the OpenClaw workspace.

It is an operator aid, not a replacement for gateway fixes.

## Why It Exists

Gateway incidents often look similar from the UI:

- The UI says `gateway disconnected`, but the gateway process is still alive.
- A WebSocket handshake times out, but a simple health probe still works.
- A background memory/cron/model task stalls and makes the gateway look broken.
- Someone restarts the gateway while active work is still running.
- Memory search silently falls back to a degraded slow path.

Gateway Guardian separates these cases before an operator restarts the process.

## What It Does

- **Preflight restart guard**: blocks or warns before a risky gateway restart.
- **Watchdog**: classifies gateway state as `healthy`, `degraded`, or `critical`.
- **Diagnosis report**: captures status, health, running tasks, audit errors, stability heartbeat, process stats, and recent log evidence.
- **Dry-run restart wrapper**: shows what would happen without touching the gateway.
- **Synthetic stress run**: probes health, status, task, audit, tool, and memory-search paths under bounded load.
- **Memory degradation detection**: flags `sqlite-vec unavailable`, degraded vector recall, stuck sessions, cron/model timeouts, and related long-tail risks.
- **Maintainer skills**: installs reusable OpenClaw skill templates for bounded agent loops, public copy review, document preflight, evidence notebooks, OSS intake, document review, and prompt optimization.

## What It Does Not Do

- It does not guarantee upstream model providers respond.
- It does not replace OpenClaw core fixes.
- It does not provide hostile multi-tenant security.
- It does not automatically edit core config.
- It does not restart the gateway unless explicitly invoked without `--dry-run`.

## Quick Start

```sh
git clone https://github.com/Star-Ring-Protocol/openclaw-gateway-guardian.git
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

## Test Signal

The stress runner uses synthetic workloads for common gateway pressure patterns:

- long context handoff
- high-frequency tool probes
- memory-search-heavy retrieval
- concurrent control-plane checks
- long-running slow-path diagnosis

The repository does not include private workload data. The stress output records whether gateway health, status, task audit, memory/search paths, and guardian checks still behave under load.

## Maintainer Skill Pack

The `skill/` directory includes a small public skill pack for OpenClaw maintainers:

- `openclaw-agent-loop`: bounded diagnose/change/validate/keep-or-revert loop.
- `openclaw-copy-guard`: public documentation and release copy review.
- `openclaw-document-preflight`: local document to source-anchored Markdown planning.
- `openclaw-document-review`: source-linked review against explicit criteria.
- `openclaw-evidence-notebook`: local source-constrained evidence notebook.
- `openclaw-oss-intake`: public open-source project intake before adoption.
- `openclaw-prompt-optimizer`: turn vague maintainer requests into executable prompts.

These skills are written as public operator templates. They do not include non-public project code, runtime logs, account data, or deployment-specific configuration.

## Chinese Overview / 中文简介

OpenClaw Gateway Guardian 是一个面向 OpenClaw 的轻量级网关可靠性工具，由 **小乙-星环协议** 出品。

它用于重启前预检、故障诊断和合成压力测试。重启 gateway 之前，它会检查是否还有任务在跑、是否有卡住的 session、是否存在 cron/model timeout、memory search 是否退化，以及 gateway 是真的不可用还是深层 RPC 变慢。

它适合长期运行的 agent 系统，尤其适合那些已经遇到过：

- TUI 显示 gateway disconnected
- handshake timeout
- tick timeout
- memory 维护任务卡住
- 后台任务超时
- memory search 变慢
- 盲目重启导致任务丢失

核心价值：

减少盲目重启，保留诊断证据，降低长任务被中断的概率。

## Repository Layout

```text
skill/openclaw-gateway-guardian/
  SKILL.md
  references/failure_modes.md

skill/openclaw-agent-loop/
skill/openclaw-copy-guard/
skill/openclaw-document-preflight/
skill/openclaw-document-review/
skill/openclaw-evidence-notebook/
skill/openclaw-oss-intake/
skill/openclaw-prompt-optimizer/

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

The public stress runner uses synthetic workload probes and contains no private workload data.
