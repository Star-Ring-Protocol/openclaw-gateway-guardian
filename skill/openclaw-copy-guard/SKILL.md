---
name: openclaw-copy-guard
description: Review public docs, release notes, prompts, and skill files before publication. Use to remove hype, template residue, unsupported claims, sensitive data, and unclear operator instructions.
---

# OpenClaw Copy Guard

Use this skill before publishing README files, skill documents, release notes, examples, prompts, or package metadata.

The goal is simple operational writing: what the tool does, what it reads, what it writes, what it will not do, and how to verify it.

## Checks

- Remove vague claims about scope or automation unless the behavior is measured and documented.
- Remove template placeholders, stale examples, local-only paths, and unexplained internal labels.
- Remove credentials, tokens, personal identifiers, account IDs, and environment-specific values.
- Replace hidden implementation context with public behavior and explicit limits.
- Keep attribution and license notes factual.

## Workflow

1. Identify the publish target: repository, package, documentation page, or release note.
2. Scan the target for secrets, local paths, unsupported claims, and unclear action verbs.
3. Rewrite sections that imply hidden data, broad automation, or unverified capability.
4. Add a "Non-Goals" or "Limits" section when the tool could be misread.
5. Re-run the scan and keep a short release note of what was removed.

## Output Format

- Findings grouped by severity.
- Rewritten public copy.
- Remaining exceptions, if any, with a reason.
- Suggested release checklist.

## Non-Goals

- Do not fabricate usage numbers, benchmarks, or user stories.
- Do not rewrite legal, medical, or financial advice into a definitive claim.
- Do not use this skill to evade provenance or authorship requirements.
