---
title: Enforce ownership checks for moveTask
priority: high
tags: [security, status:backlog]
---

# Enforce ownership checks for moveTask

`apps/meseeks/convex/tasks.private.ts::moveTask` currently patches `parentId` for the supplied `taskId` without checking task ownership, destination ownership, self-parenting, or cycles. Skill-facing callers can pass task IDs, so the internal mutation must enforce the ownership boundary instead of trusting the caller.

## Objective
Guarantee task moves cannot cross user boundaries or create invalid task trees.

## Subtasks
- [ ] Require owner/task context for internal move operations.
- [ ] Verify both moved task and destination parent belong to the expected owner.
- [ ] Reject self-parenting and cycles.
- [ ] Ensure parent-child queries cannot expose children only because a parent is visible.
- [ ] Add regression tests for cross-user move attempts and invalid hierarchy moves.

## Progress Log
### 2026-05-12
- Split out from the security findings audit as a standalone public task.

## Notes
Primary files: `convex/skills/builtIn/moveTask.ts`, `convex/tasks.private.ts`, `convex/tasks.ts`.

Sources:
- [Security findings audit](../../references/security-findings-audit/_index.md)
- [DeepSec vulnerability scan](../../references/deepsec-vulnerability-scan/_index.md)
