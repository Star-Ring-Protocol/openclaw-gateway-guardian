#!/usr/bin/env node
import { execFile } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

const OPENCLAW_ROOT = process.env.OPENCLAW_ROOT || path.join(os.homedir(), ".openclaw");
const WORKSPACE = `${OPENCLAW_ROOT}/workspace`;
const OUT_ROOT = `${WORKSPACE}/diagnostics/gateway-guardian-stress`;
const GUARD_PREFLIGHT = `${WORKSPACE}/scripts/openclaw_gateway_guard_preflight.mjs`;
const GUARD_WATCHDOG = `${WORKSPACE}/scripts/openclaw_gateway_guard_watchdog.mjs`;
const GUARD_RESTART = `${WORKSPACE}/scripts/openclaw_gateway_guard_restart.mjs`;
const GUARD_DIAGNOSE = `${WORKSPACE}/scripts/openclaw_gateway_guard_diagnose.mjs`;

const SYNTHETIC_PROFILES = [
  {
    id: "long_context",
    title: "Long Context",
    weight: 1,
    queries: [
      "Summarize a long running project handoff with decisions, risks, owner notes, and next actions without losing context.",
      "从一段很长的工作交接中提炼决策、风险、待办、复用经验，并保持上下文不丢失。",
      "Review a multi-step agent session and identify which parts should be kept as reusable operational memory.",
      "把一次跨步骤任务复盘成清晰摘要，区分事实、假设、风险、后续动作和可复用模式。",
    ],
  },
  {
    id: "tool_burst",
    title: "Tool Burst",
    weight: 1,
    queries: [
      "Run quick status probes, collect tool availability, and return only the reliability summary.",
      "连续检查网关、任务、审计、工具状态，只输出异常和下一步建议。",
      "Check whether a gateway is alive before invoking deeper tools that may be slow.",
      "Simulate rapid operator checks across health, status, task list, and audit surfaces.",
    ],
  },
  {
    id: "memory_search_heavy",
    title: "Memory Search Heavy",
    weight: 1.4,
    queries: [
      "Find previous decisions, reusable patterns, and warnings related to a stalled long-running agent task.",
      "检索历史决策、复用经验、风险提示和上次失败原因，生成可执行摘要。",
      "Search memory for prior incidents where a slow retrieval path looked like a gateway failure.",
      "Look up reusable troubleshooting notes for timeout, degraded search, and background maintenance pressure.",
    ],
  },
  {
    id: "concurrent_storm",
    title: "Concurrent Storm",
    weight: 1.2,
    queries: [
      "Many operators ask for health, status, memory, and task audit at the same time; preserve gateway responsiveness.",
      "并发请求同时查询 health、status、memory、tasks、audit，观察网关是否出现长尾。",
      "Classify a burst of agent control-plane checks without restarting the gateway.",
      "Stress the gateway with concurrent lightweight probes and a few slow retrieval requests.",
    ],
  },
  {
    id: "long_running_slow_path",
    title: "Long Running Slow Path",
    weight: 1.3,
    queries: [
      "Diagnose why a long-running agent appears idle while background work is still active.",
      "判断长任务看似卡住时，应该等待、诊断、降载还是重启。",
      "Identify whether a timeout is caused by gateway connection, background work, memory retrieval, or model latency.",
      "Produce a safe recovery plan for a slow agent workflow without interrupting active work.",
    ],
  },
];

function parseArgs(argv) {
  const args = {
    profile: "stress",
    perProfile: undefined,
    concurrency: undefined,
    timeoutMs: 20000,
    memoryRatio: undefined,
    healthBursts: undefined,
    statusBursts: undefined,
    skillsBursts: undefined,
    maxGatewayFailures: 40,
    limit: 5,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    const next = argv[i + 1];
    if (item === "--profile") args.profile = next, i += 1;
    else if (item === "--per-profile") args.perProfile = Number(next), i += 1;
    else if (item === "--concurrency") args.concurrency = Number(next), i += 1;
    else if (item === "--timeout" || item === "--timeout-ms") args.timeoutMs = Number(next), i += 1;
    else if (item === "--memory-ratio") args.memoryRatio = Number(next), i += 1;
    else if (item === "--health-bursts") args.healthBursts = Number(next), i += 1;
    else if (item === "--status-bursts") args.statusBursts = Number(next), i += 1;
    else if (item === "--skills-bursts") args.skillsBursts = Number(next), i += 1;
    else if (item === "--max-gateway-failures") args.maxGatewayFailures = Number(next), i += 1;
    else if (item === "--limit") args.limit = Number(next), i += 1;
    else if (item === "--help" || item === "-h") args.help = true;
  }
  const profileDefaults = {
    smoke: { perProfile: 1, concurrency: 3, memoryRatio: 0.05, healthBursts: 4, statusBursts: 2, skillsBursts: 1 },
    stress: { perProfile: 3, concurrency: 6, memoryRatio: 0.18, healthBursts: 16, statusBursts: 6, skillsBursts: 3 },
    extreme: { perProfile: 6, concurrency: 10, memoryRatio: 0.28, healthBursts: 36, statusBursts: 12, skillsBursts: 6 },
  }[args.profile] || {};
  args.perProfile ??= profileDefaults.perProfile ?? 3;
  args.concurrency ??= profileDefaults.concurrency ?? 6;
  args.memoryRatio ??= profileDefaults.memoryRatio ?? 0.18;
  args.healthBursts ??= profileDefaults.healthBursts ?? 16;
  args.statusBursts ??= profileDefaults.statusBursts ?? 6;
  args.skillsBursts ??= profileDefaults.skillsBursts ?? 3;
  return args;
}

function usage() {
  console.log("usage: openclaw_gateway_guard_stress_train.mjs [--profile smoke|stress|extreme] [--per-profile N] [--concurrency N] [--memory-ratio 0.2]");
}

function loadSyntheticQueries(args) {
  const profiles = [];
  const queries = [];
  for (const profile of SYNTHETIC_PROFILES) {
    const count = Math.max(1, Math.ceil(args.perProfile * profile.weight));
    const selected = [];
    for (let i = 0; i < count; i += 1) {
      const base = profile.queries[i % profile.queries.length];
      const query = `${base} [synthetic:${profile.id}:case-${i + 1}]`;
      selected.push({
        profile: profile.id,
        profileTitle: profile.title,
        query,
        origin: "synthetic",
      });
    }
    profiles.push({
      id: profile.id,
      title: profile.title,
      queries: selected.length,
      sample: selected.slice(0, 2).map((item) => item.query),
    });
    queries.push(...selected);
  }
  return { profiles, queries };
}

function commandTask(kind, args, metadata = {}) {
  return { kind, file: args[0], args: args.slice(1), metadata };
}

function buildTasks(queries, args) {
  const tasks = [];
  let memorySearchScheduled = false;
  for (const item of queries) {
    tasks.push(commandTask("gateway_health", ["openclaw", "gateway", "call", "health", "--json", "--timeout", "15000"], item));
    tasks.push(commandTask("tasks_running", ["openclaw", "tasks", "list", "--json", "--status", "running"], item));
    if (hashCode(`${item.profile}:${item.query}:audit`) % 100 < 35) {
      tasks.push(commandTask("tasks_audit", ["openclaw", "tasks", "audit", "--json", "--severity", "error"], item));
    }
    const shouldSearchMemory = hashCode(`${item.profile}:${item.query}:memory`) % 100 < Math.round(args.memoryRatio * 100)
      || (!memorySearchScheduled && item.profile === "memory_search_heavy");
    if (shouldSearchMemory) {
      tasks.push(commandTask("memory_search", ["openclaw", "memory", "search", item.query, "--json", "--max-results", String(args.limit)], item));
      memorySearchScheduled = true;
    }
  }
  for (let i = 0; i < args.healthBursts; i += 1) {
    tasks.push(commandTask("gateway_health", ["openclaw", "gateway", "call", "health", "--json", "--timeout", "15000"], { probe: i + 1 }));
  }
  for (let i = 0; i < args.statusBursts; i += 1) {
    tasks.push(commandTask("gateway_status", ["openclaw", "gateway", "status", "--json"], { probe: i + 1 }));
    tasks.push(commandTask("tasks_running", ["openclaw", "tasks", "list", "--json", "--status", "running"], { probe: i + 1 }));
    if (i % 2 === 0) tasks.push(commandTask("tasks_audit", ["openclaw", "tasks", "audit", "--json", "--severity", "error"], { probe: i + 1 }));
  }
  for (let i = 0; i < args.skillsBursts; i += 1) {
    tasks.push(commandTask("skills_check", ["openclaw", "skills", "check", "--json"], { probe: i + 1 }));
  }

  const guardianTasks = [
    commandTask("guardian_preflight", [process.execPath, GUARD_PREFLIGHT, "--for", "restart", "--summary"], { phase: "during" }),
    commandTask("guardian_watchdog", [process.execPath, GUARD_WATCHDOG, "--summary"], { phase: "during" }),
    commandTask("guardian_restart_dry_run", [process.execPath, GUARD_RESTART, "--dry-run", "--summary"], { phase: "during" }),
    commandTask("guardian_diagnose", [process.execPath, GUARD_DIAGNOSE, "--summary"], { phase: "during" }),
  ];

  const shuffled = stableShuffle(tasks);
  const quarter = Math.max(1, Math.floor(shuffled.length / 4));
  shuffled.splice(quarter, 0, guardianTasks[0]);
  shuffled.splice(quarter * 2, 0, guardianTasks[1]);
  shuffled.splice(quarter * 3, 0, guardianTasks[2]);
  shuffled.push(guardianTasks[3]);
  return shuffled;
}

async function execTask(task, timeoutMs) {
  const started = Date.now();
  const result = await new Promise((resolve) => {
    execFile(task.file, task.args, {
      cwd: OPENCLAW_ROOT,
      timeout: timeoutMs,
      maxBuffer: 6 * 1024 * 1024,
    }, (error, stdout, stderr) => {
      resolve({
        exitCode: typeof error?.code === "number" ? error.code : 0,
        signal: error?.signal || null,
        timedOut: Boolean(error?.killed || error?.signal === "SIGTERM" || /timed? ?out|timeout/i.test(String(error?.message || ""))),
        stdout: String(stdout || ""),
        stderr: String(stderr || ""),
        error: error ? String(error.message || error) : "",
      });
    });
  });
  const durationMs = Date.now() - started;
  return normalizeResult(task, { ...result, durationMs, timeoutMs });
}

function normalizeResult(task, raw) {
  const parsed = parseJsonLoose(raw.stdout);
  const okExit = raw.exitCode === 0;
  const guardianSignal = task.kind.startsWith("guardian_");
  return {
    kind: task.kind,
    profile: task.metadata.profile,
    profileTitle: task.metadata.profileTitle,
    query: task.metadata.query,
    probe: task.metadata.probe,
    phase: task.metadata.phase,
    ok: okExit || guardianSignal,
    exitCode: raw.exitCode,
    signal: raw.signal,
    timedOut: raw.timedOut || (raw.exitCode !== 0 && raw.durationMs >= raw.timeoutMs - 500),
    durationMs: raw.durationMs,
    stderr: trim(raw.stderr, 600),
    error: trim(raw.error, 400),
    parsedSummary: summarizeParsed(task, parsed),
  };
}

function summarizeParsed(task, parsed) {
  if (!parsed) return {};
  if (task.kind === "memory_search") {
    const rows = Array.isArray(parsed) ? parsed : parsed.results || parsed.memories || [];
    return {
      resultCount: rows.length,
      topSource: rows[0]?.source,
      topScore: rows[0]?.score,
    };
  }
  if (task.kind === "gateway_health") {
    return {
      ok: parsed.ok,
      durationMs: parsed.durationMs,
      pluginErrors: parsed.plugins?.errors?.length || 0,
      defaultAgentId: parsed.defaultAgentId,
    };
  }
  if (task.kind === "gateway_status") {
    return {
      running: parsed.service?.runtime?.status,
      rpcOk: parsed.rpc?.ok,
      pid: parsed.service?.runtime?.pid,
      bindHost: parsed.gateway?.bindHost,
      port: parsed.gateway?.port,
    };
  }
  if (task.kind === "tasks_running") {
    const rows = Array.isArray(parsed) ? parsed : parsed.tasks || [];
    return { runningCount: rows.length };
  }
  if (task.kind === "tasks_audit") {
    const rows = Array.isArray(parsed) ? parsed : parsed.items || parsed.entries || parsed.errors || [];
    return { errorCount: rows.length };
  }
  if (task.kind === "skills_check") {
    return {
      total: parsed.summary?.total,
      eligible: parsed.summary?.eligible,
      blocked: parsed.summary?.blocked,
      missingRequirements: parsed.summary?.missingRequirements,
    };
  }
  if (task.kind.startsWith("guardian_")) {
    return {
      ok: parsed.ok,
      type: parsed.type,
      severity: parsed.severity,
      decision: parsed.decision,
      riskScore: parsed.riskScore,
      blocks: parsed.blocks || [],
      warnings: parsed.warnings || [],
      recommendedAction: parsed.recommended_action,
      aborted: parsed.aborted,
      reason: parsed.reason,
    };
  }
  return {};
}

async function runPhaseGuardian(phase, timeoutMs) {
  const probes = [
    commandTask("guardian_preflight", [process.execPath, GUARD_PREFLIGHT, "--for", "restart", "--summary"], { phase }),
    commandTask("guardian_watchdog", [process.execPath, GUARD_WATCHDOG, "--summary"], { phase }),
    commandTask("guardian_restart_dry_run", [process.execPath, GUARD_RESTART, "--dry-run", "--summary"], { phase }),
  ];
  const results = [];
  for (const probe of probes) results.push(await execTask(probe, timeoutMs));
  return results;
}

async function runConcurrent(tasks, args) {
  const results = [];
  let next = 0;
  let gatewayFailures = 0;
  async function worker() {
    while (next < tasks.length) {
      const index = next;
      next += 1;
      if (gatewayFailures >= args.maxGatewayFailures) {
        results.push({
          kind: tasks[index].kind,
          profile: tasks[index].metadata.profile,
          query: tasks[index].metadata.query,
          ok: false,
          skipped: true,
          durationMs: 0,
          parsedSummary: { reason: "gateway failure circuit breaker" },
        });
        continue;
      }
      const result = await execTask(tasks[index], args.timeoutMs);
      results.push(result);
      if (isGatewaySurface(tasks[index].kind) && !result.ok) gatewayFailures += 1;
    }
  }
  const workers = Array.from({ length: Math.max(1, args.concurrency) }, () => worker());
  await Promise.all(workers);
  return results;
}

function isGatewaySurface(kind) {
  return ["memory_search", "gateway_health", "gateway_status", "tasks_running", "tasks_audit", "skills_check"].includes(kind);
}

function summarizeRun(result) {
  const all = [...result.before, ...result.results, ...result.after];
  const byKind = {};
  for (const item of all) {
    const bucket = byKind[item.kind] ||= {
      total: 0,
      ok: 0,
      failed: 0,
      timedOut: 0,
      p50Ms: 0,
      p95Ms: 0,
      maxMs: 0,
    };
    bucket.total += 1;
    if (item.ok) bucket.ok += 1;
    else bucket.failed += 1;
    if (item.timedOut) bucket.timedOut += 1;
  }
  for (const [kind, bucket] of Object.entries(byKind)) {
    const durations = all.filter((item) => item.kind === kind).map((item) => item.durationMs).sort((a, b) => a - b);
    bucket.p50Ms = percentile(durations, 0.5);
    bucket.p95Ms = percentile(durations, 0.95);
    bucket.maxMs = durations.at(-1) || 0;
  }
  const guardian = all.filter((item) => item.kind.startsWith("guardian_")).map((item) => ({
    phase: item.phase,
    kind: item.kind,
    ok: item.ok,
    exitCode: item.exitCode,
    durationMs: item.durationMs,
    ...item.parsedSummary,
  }));
  const memorySearch = all.filter((item) => item.kind === "memory_search");
  const guardianRaised = guardian.some((item) => ["caution", "block"].includes(item.decision) || ["degraded", "critical"].includes(item.severity));
  const dryRunProtected = guardian.some((item) => item.kind === "guardian_restart_dry_run" && item.aborted === true && item.reason === "dry_run");
  const gatewaySurfaceErrors = all.filter((item) => isGatewaySurface(item.kind) && !item.ok).length;
  return {
    totalCommands: all.length,
    workloadCommands: result.results.length,
    gatewaySurfaceErrors,
    byKind,
    guardian,
    effectSignals: {
      guardianRaised,
      dryRunProtected,
      memorySearchExercised: memorySearch.length,
      memorySearchFailures: memorySearch.filter((item) => !item.ok).length,
    },
  };
}

function renderMarkdown(result) {
  const s = result.summary;
  const lines = [];
  lines.push("# OpenClaw Gateway Guardian Stress Report");
  lines.push("");
  lines.push(`- run_id: ${result.run_id}`);
  lines.push(`- generated_at: ${result.generated_at}`);
  lines.push(`- profile: ${result.args.profile}`);
  lines.push(`- concurrency: ${result.args.concurrency}`);
  lines.push(`- per_profile_queries: ${result.args.perProfile}`);
  lines.push(`- memory_ratio: ${result.args.memoryRatio}`);
  lines.push(`- total_commands: ${s.totalCommands}`);
  lines.push(`- gateway_surface_errors: ${s.gatewaySurfaceErrors}`);
  lines.push("");
  lines.push("## Synthetic Profiles");
  lines.push("| profile | title | queries | sample |");
  lines.push("|---|---|---:|---|");
  for (const profile of result.profiles) {
    lines.push(`| ${profile.id} | ${profile.title} | ${profile.queries} | ${profile.sample.map(escapePipe).join("<br>")} |`);
  }
  lines.push("");
  lines.push("## Command Classes");
  lines.push("| kind | total | ok | failed | timeout | p50 ms | p95 ms | max ms |");
  lines.push("|---|---:|---:|---:|---:|---:|---:|---:|");
  for (const [kind, row] of Object.entries(s.byKind).sort()) {
    lines.push(`| ${kind} | ${row.total} | ${row.ok} | ${row.failed} | ${row.timedOut} | ${row.p50Ms} | ${row.p95Ms} | ${row.maxMs} |`);
  }
  lines.push("");
  lines.push("## Guardian Signals");
  lines.push("| phase | kind | decision | severity | risk | warnings | action |");
  lines.push("|---|---|---|---|---:|---|---|");
  for (const item of s.guardian) {
    lines.push(`| ${item.phase || ""} | ${item.kind} | ${item.decision || ""} | ${item.severity || ""} | ${item.riskScore ?? ""} | ${(item.warnings || []).map(escapePipe).join("<br>")} | ${escapePipe(item.recommendedAction || item.reason || "")} |`);
  }
  lines.push("");
  lines.push("## Effect Signals");
  lines.push(`- guardian_raised: ${s.effectSignals.guardianRaised}`);
  lines.push(`- dry_run_restart_protected: ${s.effectSignals.dryRunProtected}`);
  lines.push(`- memory_search_exercised: ${s.effectSignals.memorySearchExercised}`);
  lines.push(`- memory_search_failures: ${s.effectSignals.memorySearchFailures}`);
  lines.push("");
  lines.push("## Notable Failures");
  const failures = [...result.before, ...result.results, ...result.after].filter((item) => !item.ok).slice(0, 20);
  if (!failures.length) {
    lines.push("- none");
  } else {
    for (const item of failures) {
      lines.push(`- ${item.kind} profile=${item.profile || ""} exit=${item.exitCode} duration=${item.durationMs}ms stderr=${escapePipe(item.stderr || item.error || "")}`);
    }
  }
  lines.push("");
  lines.push("## Notes");
  lines.push("- This is a bounded synthetic stress run. It does not perform real external actions, production memory writes, publishing, or core config edits.");
  lines.push("- Gateway Guardian effectiveness is measured by early warning, diagnosis capture, and guarded dry-run restart behavior.");
  return `${lines.join("\n")}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }
  for (const file of [GUARD_PREFLIGHT, GUARD_WATCHDOG, GUARD_RESTART, GUARD_DIAGNOSE]) {
    if (!existsSync(file)) throw new Error(`required file missing: ${file}`);
  }
  const runId = stamp();
  const outDir = `${OUT_ROOT}/${runId}`;
  mkdirSync(outDir, { recursive: true });
  const loaded = loadSyntheticQueries(args);
  const workload = buildTasks(loaded.queries, args);
  const before = await runPhaseGuardian("before", args.timeoutMs);
  const results = await runConcurrent(workload, args);
  const after = await runPhaseGuardian("after", args.timeoutMs);
  const payload = {
    ok: true,
    run_id: runId,
    generated_at: new Date().toISOString(),
    args,
    profiles: loaded.profiles,
    query_count: loaded.queries.length,
    workload_count: workload.length,
    before,
    results,
    after,
  };
  payload.summary = summarizeRun(payload);
  const jsonPath = `${outDir}/gateway_guard_stress_results.json`;
  const mdPath = `${outDir}/gateway_guard_stress_report.md`;
  writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  writeFileSync(mdPath, renderMarkdown(payload), "utf8");
  writeFileSync(`${OUT_ROOT}/gateway_guard_stress.latest.json`, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  writeFileSync(`${OUT_ROOT}/gateway_guard_stress.latest.md`, renderMarkdown(payload), "utf8");
  console.log(JSON.stringify({
    ok: payload.ok,
    run_id: runId,
    json_path: jsonPath,
    md_path: mdPath,
    query_count: payload.query_count,
    workload_count: payload.workload_count,
    summary: payload.summary,
  }, null, 2));
}

function parseJsonLoose(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    const firstObject = trimmed.indexOf("{");
    const firstArray = trimmed.indexOf("[");
    const start = firstArray >= 0 && (firstArray < firstObject || firstObject < 0) ? firstArray : firstObject;
    if (start < 0) return null;
    try {
      return JSON.parse(trimmed.slice(start));
    } catch {
      return null;
    }
  }
}

function stableShuffle(items) {
  return items
    .map((item, index) => ({ item, key: hashCode(`${item.kind}:${item.metadata.profile || ""}:${item.metadata.query || ""}:${index}`) }))
    .sort((a, b) => a.key - b.key)
    .map((entry) => entry.item);
}

function hashCode(value) {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function percentile(values, p) {
  if (!values.length) return 0;
  const index = Math.min(values.length - 1, Math.max(0, Math.ceil(values.length * p) - 1));
  return values[index];
}

function trim(value, limit) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}...`;
}

function escapePipe(value) {
  return String(value || "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function stamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
}

main().catch((error) => {
  console.error(`gateway guard stress run failed: ${error?.stack || error}`);
  process.exit(2);
});
