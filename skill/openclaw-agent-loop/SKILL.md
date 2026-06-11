---
name: openclaw-agent-loop
description: Run a bounded maintainer loop for local OpenClaw changes. Use when a task needs diagnosis, a small candidate change, validation, and an explicit keep or revert decision.
---

# OpenClaw Agent Loop

Use this skill for small, reviewable maintenance tasks where the safest path is to make one candidate change, test it, and decide whether to keep it.

This skill is not an autonomous production updater. It keeps the loop local, bounded, and reviewable.

## Safety Rules

- Work on one issue or one narrow improvement at a time.
- Set a maximum of three iterations unless the maintainer explicitly raises it.
- Keep a short evidence note for each iteration: diagnosis, changed files, validation, and decision.
- Do not change credentials, deployment targets, or production state.
- Do not keep a candidate change when validation is missing or failing.

## Workflow

1. State the target behavior and the current failure.
2. List the files or commands that will be touched.
3. Make the smallest candidate change that can be validated.
4. Run syntax checks, targeted tests, and any project-specific validation command.
5. Compare before and after behavior.
6. Decide `keep`, `revise`, or `revert`.
7. Record the evidence and remaining risk.

## Inputs

- Issue description or failing command.
- Allowed file scope.
- Validation commands.
- Maximum iteration count.

## Outputs

- Candidate change summary.
- Validation output summary.
- Keep/revise/revert decision.
- Follow-up items that were deliberately left out of scope.

## Non-Goals

- No unattended production deploys.
- No broad refactors.
- No silent dependency installation.
- No changes to secrets, accounts, or environment-specific configuration.

