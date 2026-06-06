#!/usr/bin/env node
import {
  collectGatewayGuardSnapshot,
  evaluatePreflight,
  parseArgs,
  printPreflightText,
  writeJsonReport,
} from "./openclaw_gateway_guard_lib.mjs";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const snapshot = await collectGatewayGuardSnapshot({
    timeoutMs: Number(args.timeout || args.timeoutMs || 12000),
    windowMinutes: Number(args.windowMinutes || 30),
    maxLogLines: Number(args.maxLogLines || 1800),
  });
  const evaluation = evaluatePreflight(snapshot, {
    purpose: "watchdog",
    strict: false,
  });
  const severity = classify(evaluation, snapshot);
  const payload = {
    ok: severity !== "critical",
    type: "gateway_guard_watchdog",
    severity,
    evaluation,
    snapshot,
    recommended_action: recommend(severity, evaluation, snapshot),
  };
  const paths = await writeJsonReport("gateway_guard_watchdog", payload);
  payload.report = paths;

  if (args.summary || args.summaryJson) {
    console.log(JSON.stringify({
      ok: payload.ok,
      type: payload.type,
      severity,
      decision: evaluation.decision,
      riskScore: evaluation.riskScore,
      blocks: evaluation.blocks,
      warnings: evaluation.warnings,
      recommended_action: payload.recommended_action,
      report: paths,
    }, null, 2));
  } else if (args.json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log(`OpenClaw Gateway Guardian watchdog: ${severity.toUpperCase()}`);
    printPreflightText(evaluation, snapshot);
    console.log(`recommended_action: ${payload.recommended_action}`);
    console.log(`report: ${paths.latestPath}`);
  }
  if (severity === "critical") process.exit(21);
  if (severity === "degraded" && args.failOnDegraded) process.exit(20);
}

function classify(evaluation, snapshot) {
  if (evaluation.blocks.length) return "critical";
  const counts = snapshot.logAnalysis?.counts || {};
  const connectionProblems = Number(counts.handshakeTimeout || 0) + Number(counts.gatewayRequestTimeout || 0) + Number(counts.tickTimeout || 0);
  const backgroundProblems = Number(counts.cronTimeout || 0) + Number(counts.modelTimeout || 0) + Number(counts.stuckSession || 0) + Number(counts.memoryVectorDegraded || 0);
  const status = snapshot.status?.parsed || {};
  const health = snapshot.health?.parsed || {};
  const gatewayHealthy = status.service?.runtime?.status === "running" && status.rpc?.ok === true && health.ok === true;
  if (connectionProblems >= 3 && !gatewayHealthy) return "critical";
  if (connectionProblems >= 3 || backgroundProblems >= 2) return "degraded";
  if (evaluation.warnings.length || connectionProblems || backgroundProblems) return "degraded";
  return "healthy";
}

function recommend(severity, evaluation, snapshot) {
  const counts = snapshot.logAnalysis?.counts || {};
  if (evaluation.blocks.length) return "do not restart blindly; inspect active tasks and wait or cancel deliberately";
  if (counts.cronTimeout || counts.modelTimeout) return "pause/delay background memory maintenance and check provider latency before restart";
  if (counts.handshakeTimeout || counts.gatewayRequestTimeout || counts.tickTimeout) return "treat as connection-surface degradation; use status/health split and avoid deep probes";
  if (severity === "degraded") return "capture diagnose report and retry after cooldown";
  return "no action";
}

main().catch((error) => {
  console.error(`gateway guard watchdog failed: ${error?.stack || error}`);
  process.exit(2);
});
