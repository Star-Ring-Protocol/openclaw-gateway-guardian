#!/usr/bin/env node
import { execFile } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export const OPENCLAW_ROOT = process.env.OPENCLAW_ROOT || path.join(os.homedir(), ".openclaw");
export const WORKSPACE_DIR = path.join(OPENCLAW_ROOT, "workspace");
export const DIAG_DIR = path.join(WORKSPACE_DIR, "diagnostics", "gateway-guardian");
export const DEFAULT_TIMEOUT_MS = 15000;
export const DEFAULT_WINDOW_MINUTES = 45;

export function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (!value.startsWith("--")) {
      args._.push(value);
      continue;
    }
    const key = value.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      args[key] = next;
      i += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

export async function runCommand(file, args, options = {}) {
  const timeoutMs = Number(options.timeoutMs || DEFAULT_TIMEOUT_MS);
  const cwd = options.cwd || OPENCLAW_ROOT;
  const startedAt = Date.now();
  return await new Promise((resolve) => {
    execFile(file, args, {
      cwd,
      timeout: timeoutMs,
      maxBuffer: options.maxBuffer || 8 * 1024 * 1024,
      env: process.env,
    }, (error, stdout, stderr) => {
      const durationMs = Date.now() - startedAt;
      resolve({
        ok: !error,
        code: typeof error?.code === "number" ? error.code : error ? 1 : 0,
        signal: error?.signal || null,
        timedOut: Boolean(error?.killed || error?.signal === "SIGTERM") && durationMs >= timeoutMs - 100,
        durationMs,
        stdout: String(stdout || ""),
        stderr: String(stderr || ""),
        error: error ? String(error.message || error) : null,
        command: [file, ...args].join(" "),
      });
    });
  });
}

export async function runOpenClaw(args, options = {}) {
  return await runCommand("openclaw", args, options);
}

export async function runOpenClawJson(args, options = {}) {
  const result = await runOpenClaw(args, options);
  if (!result.ok) return { ok: false, result, data: null, parseError: null };
  try {
    return { ok: true, result, data: JSON.parse(result.stdout), parseError: null };
  } catch (error) {
    return { ok: false, result, data: null, parseError: String(error.message || error) };
  }
}

export async function ensureDiagDir() {
  await fsp.mkdir(DIAG_DIR, { recursive: true });
}

export function timestampForFile(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

export async function writeJsonReport(prefix, payload) {
  await ensureDiagDir();
  const stamp = timestampForFile();
  const runPath = path.join(DIAG_DIR, `${prefix}.${stamp}.json`);
  const latestPath = path.join(DIAG_DIR, `${prefix}.latest.json`);
  const body = `${JSON.stringify(payload, null, 2)}\n`;
  await fsp.writeFile(runPath, body, "utf8");
  await fsp.writeFile(latestPath, body, "utf8");
  return { runPath, latestPath };
}

export async function resolveLogFile(statusData = null) {
  if (statusData?.logFile && fs.existsSync(statusData.logFile)) return statusData.logFile;
  const dir = "/tmp/openclaw";
  try {
    const entries = await fsp.readdir(dir);
    const logs = [];
    for (const entry of entries) {
      if (!/^openclaw-.*\.log$/.test(entry)) continue;
      const full = path.join(dir, entry);
      const stat = await fsp.stat(full);
      logs.push({ full, mtimeMs: stat.mtimeMs });
    }
    logs.sort((a, b) => b.mtimeMs - a.mtimeMs);
    return logs[0]?.full || null;
  } catch {
    return null;
  }
}

export async function readRecentLogLines(logFile, maxLines = 1500) {
  if (!logFile || !fs.existsSync(logFile)) return [];
  const text = await fsp.readFile(logFile, "utf8");
  const lines = text.split(/\r?\n/).filter(Boolean);
  return lines.slice(Math.max(0, lines.length - maxLines));
}

function parseJsonLog(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function logMessage(line) {
  const json = parseJsonLog(line);
  if (!json) return line;
  const parts = [];
  if (typeof json.message === "string") parts.push(json.message);
  for (const key of ["0", "1", "2"]) {
    const value = json[key];
    if (typeof value === "string") parts.push(value);
    else if (value && typeof value === "object") parts.push(JSON.stringify(value));
  }
  return parts.filter(Boolean).join(" ");
}

function logTimestampMs(line) {
  const json = parseJsonLog(line);
  const raw = json?._meta?.date || json?.time;
  const parsed = raw ? Date.parse(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function pushSample(samples, kind, tsMs, message) {
  if (samples.length >= 24) return;
  samples.push({
    kind,
    ts: tsMs ? new Date(tsMs).toISOString() : null,
    message: message.slice(0, 600),
  });
}

export function analyzeLogLines(lines, options = {}) {
  const nowMs = Number(options.nowMs || Date.now());
  const windowMinutes = Number(options.windowMinutes || DEFAULT_WINDOW_MINUTES);
  const cutoffMs = nowMs - windowMinutes * 60 * 1000;
  const counts = {
    handshakeTimeout: 0,
    gatewayRequestTimeout: 0,
    tickTimeout: 0,
    restart: 0,
    drainingActive: 0,
    stuckSession: 0,
    cronTimeout: 0,
    modelTimeout: 0,
    slowRpc: 0,
    memoryVectorDegraded: 0,
  };
  const samples = [];
  for (const line of lines) {
    const tsMs = logTimestampMs(line);
    if (tsMs && tsMs < cutoffMs) continue;
    const message = logMessage(line);
    const lower = message.toLowerCase();
    let matched = false;
    if (/handshake[- ]timeout/.test(lower)) {
      counts.handshakeTimeout += 1;
      pushSample(samples, "handshake_timeout", tsMs, message);
      matched = true;
    }
    if (/gateway request timeout|gateway timeout after/.test(lower)) {
      counts.gatewayRequestTimeout += 1;
      if (!matched) pushSample(samples, "gateway_request_timeout", tsMs, message);
      matched = true;
    }
    if (/tick timeout/.test(lower)) {
      counts.tickTimeout += 1;
      if (!matched) pushSample(samples, "tick_timeout", tsMs, message);
      matched = true;
    }
    if (/received sigterm|service restart|restart mode|gateway ready/.test(lower)) {
      counts.restart += 1;
      if (!matched && /received sigterm|service restart|restart mode/.test(lower)) pushSample(samples, "restart", tsMs, message);
      matched = true;
    }
    if (/draining .*active task|active embedded run/.test(lower)) {
      counts.drainingActive += 1;
      if (!matched) pushSample(samples, "draining_active", tsMs, message);
      matched = true;
    }
    if (/stuck session|session\.stuck/.test(lower)) {
      counts.stuckSession += 1;
      if (!matched) pushSample(samples, "stuck_session", tsMs, message);
      matched = true;
    }
    if (/cron: job execution timed out|cron: job failed:.*timed out/.test(lower)) {
      counts.cronTimeout += 1;
      if (!matched) pushSample(samples, "cron_timeout", tsMs, message);
      matched = true;
    }
    if (/llm request timed out|profile .* timed out|failoverreason.*timeout|model_fallback.*timeout/.test(lower)) {
      counts.modelTimeout += 1;
      if (!matched) pushSample(samples, "model_timeout", tsMs, message);
      matched = true;
    }
    if (/chunks_vec not updated|sqlite-vec unavailable|vector recall degraded/.test(lower)) {
      counts.memoryVectorDegraded += 1;
      if (!matched) pushSample(samples, "memory_vector_degraded", tsMs, message);
      matched = true;
    }
    const rpcMatch = message.match(/res\s+.\s+([A-Za-z0-9_.-]+)\s+(\d+)ms/);
    if (rpcMatch && Number(rpcMatch[2]) >= Number(options.slowRpcMs || 5000)) {
      counts.slowRpc += 1;
      pushSample(samples, "slow_rpc", tsMs, message);
    }
  }
  return { windowMinutes, counts, samples };
}

export function latestHeartbeat(stability) {
  const events = Array.isArray(stability?.events) ? stability.events : [];
  return [...events].reverse().find((event) => event.type === "diagnostic.heartbeat") || null;
}

export function maxRecentActive(stability, maxAgeMs = 10 * 60 * 1000) {
  const generated = Date.parse(stability?.generatedAt || "");
  const nowMs = Number.isFinite(generated) ? generated : Date.now();
  const events = Array.isArray(stability?.events) ? stability.events : [];
  let max = 0;
  for (const event of events) {
    if (event.type !== "diagnostic.heartbeat") continue;
    if (typeof event.ts === "number" && nowMs - event.ts > maxAgeMs) continue;
    max = Math.max(max, Number(event.active || 0) + Number(event.waiting || 0) + Number(event.queued || 0));
  }
  return max;
}

export function heartbeatWorkCount(event) {
  if (!event) return 0;
  return Number(event.active || 0) + Number(event.waiting || 0) + Number(event.queued || 0);
}

export async function collectGatewayGuardSnapshot(options = {}) {
  const timeoutMs = Number(options.timeoutMs || DEFAULT_TIMEOUT_MS);
  const windowMinutes = Number(options.windowMinutes || DEFAULT_WINDOW_MINUTES);
  const status = await runOpenClawJson(["gateway", "status", "--json", "--timeout", String(timeoutMs)], { timeoutMs: timeoutMs + 3000 });
  const health = await runOpenClawJson(["gateway", "call", "health", "--json", "--timeout", String(timeoutMs)], { timeoutMs: timeoutMs + 3000 });
  const runningTasks = await runOpenClawJson(["tasks", "list", "--json", "--status", "running"], { timeoutMs });
  const auditErrors = await runOpenClawJson(["tasks", "audit", "--json", "--severity", "error"], { timeoutMs });
  const stability = await runOpenClawJson(["gateway", "stability", "--json"], { timeoutMs });
  const statusData = status.data || null;
  const logFile = await resolveLogFile(statusData);
  const logLines = await readRecentLogLines(logFile, Number(options.maxLogLines || 1800));
  const logAnalysis = analyzeLogLines(logLines, { windowMinutes, slowRpcMs: options.slowRpcMs });
  const pid = statusData?.service?.runtime?.pid || null;
  const ps = pid ? await runCommand("ps", ["-o", "pid=,%cpu=,%mem=,rss=,etime=,command=", "-p", String(pid)], { timeoutMs: 5000 }) : null;
  return {
    generated_at: new Date().toISOString(),
    protocol: "openclaw_gateway_guard_snapshot_v0_1",
    options: { timeoutMs, windowMinutes },
    commands: {
      status,
      health,
      runningTasks,
      auditErrors,
      stability,
      ps,
    },
    status: statusData,
    health: health.data,
    runningTasks: runningTasks.data,
    auditErrors: auditErrors.data,
    stability: stability.data,
    process: parsePs(pid, ps),
    logFile,
    logAnalysis,
  };
}

function parsePs(pid, ps) {
  if (!ps?.ok || !ps.stdout.trim()) return { pid, ok: false, raw: ps?.stdout || "", error: ps?.error || null };
  const raw = ps.stdout.trim();
  const match = raw.match(/^\s*(\d+)\s+([\d.]+)\s+([\d.]+)\s+(\d+)\s+(\S+)\s+(.+)$/);
  if (!match) return { pid, ok: true, raw };
  return {
    pid: Number(match[1]),
    cpuPercent: Number(match[2]),
    memPercent: Number(match[3]),
    rssKb: Number(match[4]),
    elapsed: match[5],
    command: match[6],
    raw,
  };
}

export function evaluatePreflight(snapshot, options = {}) {
  const purpose = options.purpose || "restart";
  const strict = Boolean(options.strict);
  const blocks = [];
  const warnings = [];
  const info = [];
  const runningCount = Number(snapshot.runningTasks?.count || snapshot.runningTasks?.tasks?.length || 0);
  const auditErrorCount = Number(snapshot.auditErrors?.summary?.combined?.errors || snapshot.auditErrors?.summary?.errors || 0);
  const latestActive = heartbeatWorkCount(latestHeartbeat(snapshot.stability));
  const recentActiveMax = maxRecentActive(snapshot.stability);
  const statusOk = Boolean(snapshot.commands?.status?.ok && snapshot.status?.rpc?.ok);
  const healthOk = Boolean(snapshot.commands?.health?.ok && snapshot.health?.ok);

  if (runningCount > 0) blocks.push(`running tasks present: ${runningCount}`);
  if (auditErrorCount > 0) blocks.push(`task audit has errors: ${auditErrorCount}`);
  if (latestActive > 0) blocks.push(`latest stability heartbeat shows active/waiting/queued work: ${latestActive}`);
  else if (recentActiveMax > 0) warnings.push(`recent stability heartbeat had active/waiting/queued work: ${recentActiveMax}`);
  if (!statusOk) warnings.push("gateway status/RPC probe is not clean");
  if (!healthOk) warnings.push("gateway health did not return ok");

  const c = snapshot.logAnalysis?.counts || {};
  if (c.handshakeTimeout > 0) warnings.push(`recent handshake timeouts: ${c.handshakeTimeout}`);
  if (c.gatewayRequestTimeout > 0) warnings.push(`recent gateway request timeouts: ${c.gatewayRequestTimeout}`);
  if (c.tickTimeout > 0) warnings.push(`recent tick timeouts: ${c.tickTimeout}`);
  if (c.drainingActive > 0) warnings.push(`recent restart/drain while active: ${c.drainingActive}`);
  if (c.stuckSession > 0) warnings.push(`recent stuck sessions: ${c.stuckSession}`);
  if (c.cronTimeout > 0) warnings.push(`recent cron timeouts: ${c.cronTimeout}`);
  if (c.modelTimeout > 0) warnings.push(`recent model/provider timeouts: ${c.modelTimeout}`);
  if (c.slowRpc > 0) warnings.push(`recent slow RPCs: ${c.slowRpc}`);
  if (c.memoryVectorDegraded > 0) warnings.push(`recent memory vector degraded warnings: ${c.memoryVectorDegraded}`);

  const cpu = Number(snapshot.process?.cpuPercent || 0);
  const rssKb = Number(snapshot.process?.rssKb || 0);
  if (cpu >= 150) warnings.push(`gateway CPU high: ${cpu}%`);
  if (rssKb >= 2.5 * 1024 * 1024) warnings.push(`gateway RSS high: ${Math.round(rssKb / 1024)} MiB`);

  if (statusOk) info.push("gateway status RPC ok");
  if (healthOk) info.push("gateway health ok");
  if (runningCount === 0) info.push("no tracked running tasks");
  if (auditErrorCount === 0) info.push("task audit has no errors");

  let decision = blocks.length > 0 ? "block" : warnings.length > 0 ? "caution" : "allow";
  if (strict && decision === "caution") decision = "block";
  if (purpose === "diagnose") decision = blocks.length > 0 ? "caution" : decision;
  const riskScore = Math.min(100, blocks.length * 40 + warnings.length * 8);
  return {
    purpose,
    strict,
    decision,
    riskScore,
    blocks,
    warnings,
    info,
  };
}

export function printPreflightText(result, snapshot) {
  console.log(`OpenClaw Gateway Guardian preflight: ${result.decision.toUpperCase()} risk=${result.riskScore}`);
  if (result.blocks.length) {
    console.log("Blocks:");
    for (const item of result.blocks) console.log(`- ${item}`);
  }
  if (result.warnings.length) {
    console.log("Warnings:");
    for (const item of result.warnings) console.log(`- ${item}`);
  }
  if (result.info.length) {
    console.log("OK:");
    for (const item of result.info) console.log(`- ${item}`);
  }
  if (snapshot.logAnalysis?.samples?.length) {
    console.log("Recent evidence:");
    for (const sample of snapshot.logAnalysis.samples.slice(0, 8)) {
      console.log(`- ${sample.kind}${sample.ts ? ` @ ${sample.ts}` : ""}: ${sample.message}`);
    }
  }
}
