---
name: oc-prompt-optimizer
description: Convert unclear maintainer requests into executable prompts with variables, missing information, test cases, and acceptance criteria.
---

# OpenClaw Prompt Optimizer

Use this skill when a request is too vague for a reliable agent run, review, or maintenance task.

The optimized prompt should preserve the user's intent while making scope, inputs, outputs, constraints, and validation explicit.

## Workflow

1. Restate the original request in one sentence.
2. Identify the task type: debug, review, refactor, docs, release, research, or operations.
3. Extract variables and unknowns.
4. Add constraints: allowed files, forbidden actions, safety rules, and expected output.
5. Add acceptance criteria and validation commands.
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
