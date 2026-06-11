---
name: oc-evidence-notebook
description: Build a local, source-constrained evidence notebook for maintainer decisions, incident review, and documentation updates.
---

# OpenClaw Evidence Notebook

Use this skill when several local sources need to be compared before a maintainer decision.

The notebook keeps facts tied to sources. It is useful for incident notes, release readiness, design review, and public documentation checks.

## Safety Rules

- Use only approved local sources and public URLs supplied for the task.
- Keep answers source-constrained. If a claim is not in the sources, label it as inference or question.
- Separate facts, conflicts, assumptions, and decisions.
- Do not include secrets, raw logs with credentials, or irrelevant personal data in notebook output.

## Workflow

1. Create a source list with title, type, date, and trust level.
2. Extract source cards with short facts and anchors.
3. Group related evidence under decision questions.
4. Mark conflicts and missing information.
5. Draft source-constrained answers with citations.
6. Produce a short "decision packet" for maintainer review.

## Outputs

- Source list.
- Evidence cards.
- Conflict list.
- Source-constrained answers.
- Decision packet.

## Non-Goals

- No broad web research unless explicitly requested.
- No unsourced conclusions.
- No external upload or indexing by default.
