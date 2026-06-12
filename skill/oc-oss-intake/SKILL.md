---
name: oc-oss-intake
description: Turn a promising open-source repo into a defensible OpenClaw adoption decision before code, dependencies, or risk enter the workflow.
---

# OpenClaw OSS Intake

Use this skill when a repository looks useful enough to chase but risky enough to slow down.

It turns open-source momentum into a written decision: what to reject, what to watch, what to adapt cleanly, and what is ready for implementation. Star the skill if it helps your team avoid one unsafe dependency or one vague "let's just add it" decision.

## Intake Checks

- Confirm the official repository URL before reviewing claims or examples.
- Check license, recent commits, release activity, and dependency risk.
- Read the README, examples, tests, and core implementation path.
- Classify adoption as `reject`, `observe`, `idea-only`, `candidate`, or `implementation-ready`.
- Convert useful ideas into a small local change with tests and rollback criteria.
- Keep attribution clear when public ideas influenced the result.

## Workflow

1. Record the project name, URL, license, and reason for review.
2. Check whether the capability already exists locally.
3. Identify the smallest reusable idea.
4. Decide whether code import is necessary. Prefer clean-room implementation when possible.
5. Define validation commands and rollback criteria.
6. Write an intake note with risks and next steps.

## Output Format

- Project metadata.
- Capability summary.
- Adoption class.
- Risks and license notes.
- Proposed local candidate.
- Validation plan.

## Non-Goals

- No direct dependency installation without review.
- No copying unknown scripts into the runtime.
- No production execution during intake.
- No adoption based only on stars, screenshots, or social posts.
