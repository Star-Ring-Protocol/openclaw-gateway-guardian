# OpenClaw Gateway Guardian Overview

**Produced by XiaoYi · Star Ring Protocol / 小乙-星环协议出品**

OpenClaw Gateway Guardian is a lightweight hardening skill for OpenClaw and long-running AI agent systems. It does not promise magical crash immunity. It helps operators make safer decisions when the gateway looks unstable: whether to restart, whether active work is still running, whether the gateway is actually down, and whether memory search has degraded into a long-tail latency path.

## One-Liner

**Prevent blind restarts, detect gateway degradation, and pressure-test the real slow paths of agent systems.**

## The Problem

Many AI agent incidents look the same from the outside:

- `gateway disconnected`
- WebSocket handshake timeout
- gateway request timeout
- tick timeout
- stuck memory keeper
- background cron/model timeout
- slow memory search
- repeated restarts that interrupt active work

Gateway Guardian takes a more disciplined path: collect evidence first, then classify the risk.

It checks gateway status, health, running tasks, task audit, stability heartbeat, logs, process state, and memory/vector degradation signals. Then it writes structured diagnostic reports that can be inspected, shared, and used for follow-up fixes.

## Core Capabilities

- Restart preflight: `ALLOW / CAUTION / BLOCK`
- Gateway watchdog: `healthy / degraded / critical`
- Safe dry-run restart wrapper
- Evidence-based diagnostic reports
- Stress training across route, semantic, vector, memory search, health, status, tasks, and audit surfaces
- Degradation detection for stuck sessions, cron/model timeouts, unavailable sqlite-vec, and degraded vector recall

## Who It Is For

- OpenClaw users operating long-running agents
- Developers building AI agent gateways or MCP gateways
- Teams seeing stuck sessions, TUI disconnects, timeout storms, or slow memory search
- Builders who want agents that can do real work over time, not just demo once

## What It Is Not

- Not a replacement for OpenClaw core fixes
- Not an SLA for upstream model providers
- Not a hostile multi-tenant sandbox
- Not an automatic core-config mutation tool
- Not a dashboard that hides slow paths behind pretty charts

## Positioning

Gateway Guardian is a foundational reliability component from the XiaoYi · Star Ring Protocol agent engineering line. It is free and open source because the agent ecosystem needs practical, inspectable tools for long-running work: task protection, failure recovery, degraded memory recall detection, and safer gateway operations.

## Suggested Taglines

> Prevent blind restarts. Preserve active work. Diagnose before you reboot.

> Gateway hardening for agents that do real work.
