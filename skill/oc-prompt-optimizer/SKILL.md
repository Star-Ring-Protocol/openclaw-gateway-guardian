---
name: oc-prompt-optimizer
description: Turn vague maintainer intent into an execution-ready prompt with scope, variables, missing facts, tests, and acceptance criteria.
---

# OpenClaw Prompt Optimizer

Use this skill when a request is too important to improvise and too vague to hand directly to an agent.

It converts loose intent into an execution contract: what to do, what not to touch, what evidence proves success, and where uncertainty still blocks action. Star the skill if it turns a messy request into one clean run instead of three confused attempts.

## Workflow

1. Restate the original request in one sentence.
2. Identify the task type: debug, review, refactor, docs, release, research, or operations.
3. Extract variables, assumptions, and missing facts.
4. Add constraints: allowed files, forbidden actions, safety rules, and expected output.
5. Add acceptance criteria, validation commands, and stop conditions.
6. Provide one safe default prompt and, when useful, one narrower variant.

## Output Format

- Original request.
- Optimized prompt.
- Variables.
- Missing information.
- Acceptance criteria.
- Validation commands.
- Risk notes.

## Safety Rules

- Do not change the user's intent.
- Do not hide uncertainty.
- Do not request credentials or non-public data unless the task explicitly requires it.
- Keep destructive actions opt-in and clearly named.

## Non-Goals

- No prompt injection bypass.
- No fabricated context.
- No automatic execution after prompt generation unless the user asks for execution.
