# OpenClaw Gateway Guardian Overview

**Produced by XiaoYi · Star Ring Protocol / 小乙-星环协议出品**

OpenClaw Gateway Guardian is a lightweight reliability toolkit for OpenClaw and long-running agent gateway operations. It helps operators decide whether a restart is safe, whether active work is still running, whether the gateway is actually down, and whether memory search has degraded into a slow path.

## One-Liner

**Check restart risk, capture evidence, and test gateway slow paths with synthetic load.**

## The Problem

Many gateway incidents look the same from the outside:

- `gateway disconnected`
- WebSocket handshake timeout
- gateway request timeout
- tick timeout
- stuck memory keeper
- background cron/model timeout
- slow memory search
- repeated restarts that interrupt active work

Gateway Guardian collects evidence first, then classifies the risk.

It checks gateway status, health, running tasks, task audit, stability heartbeat, logs, process state, and memory/vector degradation signals. Then it writes structured diagnostic reports that can be inspected, shared, and used for follow-up fixes.

## Core Capabilities

- Restart preflight: `ALLOW / CAUTION / BLOCK`
- Gateway watchdog: `healthy / degraded / critical`
- Safe dry-run restart wrapper
- Evidence-based diagnostic reports
- Synthetic stress runs across health, status, task, audit, tool, and memory-search paths
- Degradation detection for stuck sessions, cron/model timeouts, unavailable sqlite-vec, and degraded vector recall

## Who It Is For

- OpenClaw users operating long-running agents
- Developers building AI agent gateways or MCP gateways
- Teams seeing stuck sessions, TUI disconnects, timeout storms, or slow memory search
- Builders who need agent systems to run for long sessions, not only short demos

## What It Is Not

- Not a replacement for OpenClaw core fixes
- Not an SLA for upstream model providers
- Not a hostile multi-tenant sandbox
- Not an automatic core-config mutation tool
- Not a dashboard or monitoring service

## Positioning

Gateway Guardian is a small open-source reliability component from XiaoYi · Star Ring Protocol. It is released under MIT so operators can inspect the checks, adapt them to their own OpenClaw runtime, and keep diagnostic work local.

## Suggested Taglines

> Check before restart. Preserve active work. Keep the evidence.

> Gateway reliability tooling for long-running agent systems.
