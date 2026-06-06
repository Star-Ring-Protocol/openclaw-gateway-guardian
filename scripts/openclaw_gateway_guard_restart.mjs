#!/usr/bin/env node
import {
  collectGatewayGuardSnapshot,
  evaluatePreflight,
  parseArgs,
  printPreflightText,
  runOpenClaw,
  runOpenClawJson,
  writeJsonReport,
} from "./openclaw_gateway_guard_lib.mjs";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const force = Boolean(args.force);
  const dryRun = Boolean(args.dryRun);
  const timeoutMs = Number(args.timeout || args.timeoutMs || 15000);
  const snapshot = await collectGatewayGuardSnapshot({
    timeoutMs,
    windowMinutes: Number(args.windowMinutes || 45),
  });
  const evaluation = evaluatePreflight(snapshot, {
    purpose: "restart",
    strict: Boolean(args.strict),
  });
  const payload = {
    ok: false,
    type: "gateway_guard_restart",
    dryRun,
    force,
    preflight: { evaluation, snapshot },
    restart: null,
    verification: [],
  };

  if (evaluation.decision === "block" && !force) {
    const paths = await writeJsonReport("gateway_guard_restart", {
      ...payload,
      ok: false,
      aborted: true,
      reason: "preflight_blocked",
    });
    if (args.summary || args.summaryJson) console.log(JSON.stringify({
      ok: false,
      type: payload.type,
      aborted: true,
      reason: "preflight_blocked",
      decision: evaluation.decision,
      riskScore: evaluation.riskScore,
      blocks: evaluation.blocks,
      warnings: evaluation.warnings,
      report: paths,
    }, null, 2));
    else if (args.json) console.log(JSON.stringify({ ...payload, report: paths, aborted: true, reason: "preflight_blocked" }, null, 2));
    else {
      printPreflightText(evaluation, snapshot);
      console.log("restart aborted: preflight blocked");
      console.log(`report: ${paths.latestPath}`);
    }
    process.exit(12);
  }

  if (dryRun) {
    const paths = await writeJsonReport("gateway_guard_restart", {
      ...payload,
      ok: evaluation.decision !== "block",
      aborted: true,
      reason: "dry_run",
    });
    if (args.summary || args.summaryJson) console.log(JSON.stringify({
      ok: evaluation.decision !== "block",
      type: payload.type,
      aborted: true,
      reason: "dry_run",
      decision: evaluation.decision,
      riskScore: evaluation.riskScore,
      blocks: evaluation.blocks,
      warnings: evaluation.warnings,
      report: paths,
    }, null, 2));
    else if (args.json) console.log(JSON.stringify({ ...payload, report: paths, aborted: true, reason: "dry_run" }, null, 2));
    else {
      printPreflightText(evaluation, snapshot);
      console.log("dry-run: restart not executed");
      console.log(`report: ${paths.latestPath}`);
    }
    return;
  }

  payload.restart = await runOpenClaw(["gateway", "restart"], { timeoutMs: Number(args.restartTimeout || 60000) });
  for (let i = 0; i < Number(args.retries || 8); i += 1) {
    await sleep(Number(args.retryDelayMs || 2500));
    const status = await runOpenClawJson(["gateway", "status", "--json", "--timeout", String(timeoutMs)], { timeoutMs: timeoutMs + 3000 });
    const health = await runOpenClawJson(["gateway", "call", "health", "--json", "--timeout", String(timeoutMs)], { timeoutMs: timeoutMs + 3000 });
    payload.verification.push({
      attempt: i + 1,
      statusOk: Boolean(status.ok && status.data?.rpc?.ok),
      healthOk: Boolean(health.ok && health.data?.ok),
      statusDurationMs: status.result?.durationMs,
      healthDurationMs: health.result?.durationMs,
    });
    if (status.ok && status.data?.rpc?.ok && health.ok && health.data?.ok) {
      payload.ok = true;
      break;
    }
  }

  const paths = await writeJsonReport("gateway_guard_restart", payload);
  if (args.summary || args.summaryJson) console.log(JSON.stringify({
    ok: payload.ok,
    type: payload.type,
    decision: evaluation.decision,
    riskScore: evaluation.riskScore,
    blocks: evaluation.blocks,
    warnings: evaluation.warnings,
    restartOk: payload.restart?.ok,
    verification: payload.verification,
    report: paths,
  }, null, 2));
  else if (args.json) console.log(JSON.stringify({ ...payload, report: paths }, null, 2));
  else {
    printPreflightText(evaluation, snapshot);
    console.log(`restart command: ${payload.restart?.ok ? "ok" : "failed"}`);
    console.log(`post-restart verification: ${payload.ok ? "ok" : "failed"}`);
    console.log(`report: ${paths.latestPath}`);
  }
  if (!payload.ok) process.exit(20);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(`gateway guard restart failed: ${error?.stack || error}`);
  process.exit(2);
});
