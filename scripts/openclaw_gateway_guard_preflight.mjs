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
  const purpose = args.for || args.purpose || "restart";
  const snapshot = await collectGatewayGuardSnapshot({
    timeoutMs: Number(args.timeout || args.timeoutMs || 15000),
    windowMinutes: Number(args.windowMinutes || 45),
  });
  const evaluation = evaluatePreflight(snapshot, {
    purpose,
    strict: Boolean(args.strict),
  });
  const payload = {
    ok: evaluation.decision !== "block",
    type: "gateway_guard_preflight",
    evaluation,
    snapshot,
  };
  const paths = await writeJsonReport("gateway_guard_preflight", payload);
  payload.report = paths;

  if (args.summary || args.summaryJson) {
    console.log(JSON.stringify({
      ok: payload.ok,
      type: payload.type,
      decision: evaluation.decision,
      riskScore: evaluation.riskScore,
      blocks: evaluation.blocks,
      warnings: evaluation.warnings,
      report: paths,
    }, null, 2));
  } else if (args.json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    printPreflightText(evaluation, snapshot);
    console.log(`report: ${paths.latestPath}`);
  }

  if (evaluation.decision === "block") process.exit(12);
  if (evaluation.decision === "caution" && args.failOnCaution) process.exit(11);
}

main().catch((error) => {
  console.error(`gateway guard preflight failed: ${error?.stack || error}`);
  process.exit(2);
});
