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
    timeoutMs: Number(args.timeout || args.timeoutMs || 15000),
    windowMinutes: Number(args.windowMinutes || 120),
    maxLogLines: Number(args.maxLogLines || 3000),
  });
  const evaluation = evaluatePreflight(snapshot, {
    purpose: "diagnose",
    strict: false,
  });
  const payload = {
    ok: true,
    type: "gateway_guard_diagnose",
    evaluation,
    snapshot,
    interpretation: interpret(evaluation, snapshot),
  };
  const paths = await writeJsonReport("gateway_guard_diagnose", payload);
  payload.report = paths;

  if (args.summary || args.summaryJson) {
    console.log(JSON.stringify({
      ok: payload.ok,
      type: payload.type,
      decision: evaluation.decision,
      riskScore: evaluation.riskScore,
      blocks: evaluation.blocks,
      warnings: evaluation.warnings,
      interpretation: payload.interpretation,
      report: paths,
    }, null, 2));
  } else if (args.json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    printPreflightText(evaluation, snapshot);
    console.log("Interpretation:");
    for (const line of payload.interpretation) console.log(`- ${line}`);
    console.log(`report: ${paths.latestPath}`);
  }
}

function interpret(evaluation, snapshot) {
  const lines = [];
  const counts = snapshot.logAnalysis?.counts || {};
  if (evaluation.blocks.length) lines.push("Do not restart blindly; active work or task-audit errors are present.");
  if (counts.handshakeTimeout || counts.gatewayRequestTimeout || counts.tickTimeout) {
    lines.push("Connection surface is degraded; split gateway liveness from WebSocket/RPC handshake health.");
  }
  if (counts.cronTimeout || counts.modelTimeout) {
    lines.push("Background cron/model path is a likely pressure source; prefer pausing or delaying maintenance jobs before restart.");
  }
  if (counts.memoryVectorDegraded) {
    lines.push("Memory search is running with degraded vector support; expect long-tail recall latency until sqlite-vec/native vector indexing or a bounded local overlay path is used.");
  }
  if (counts.slowRpc) lines.push("Slow RPCs were observed; avoid using deep status/model/plugin calls as readiness probes.");
  if (!lines.length) lines.push("No recent guardian-known failure pattern detected.");
  return lines;
}

main().catch((error) => {
  console.error(`gateway guard diagnose failed: ${error?.stack || error}`);
  process.exit(2);
});
