---
title: Enforce ownership checks for schedule cancellation paths
priority: high
tags: [security]
---

# Enforce ownership checks for schedule cancellation paths

Built-in `cancelSchedule` forwards arbitrary `scheduleId` into `internal.schedules.private._cancel`, and `_cancel` deletes schedules without validating ownership. If a foreign ID is discovered, cross-tenant cancellation is possible.

## Objective
Ensure only the schedule owner (or same task owner) can cancel a schedule through all code paths.

## Subtasks
- [ ] Add ownership validation inside `internal.schedules.private._cancel`.
- [ ] Require caller context fields needed for authorization decisions.
- [ ] Harden built-in `cancelSchedule` to pass and verify expected task/owner.
- [ ] Add negative tests for cross-user cancellation attempts.
- [ ] Confirm task-status cleanup still works for valid cancellations.

## Progress Log
### 2026-05-12
- Split back out as a standalone public security task. Source scans moved to references.

### 2026-05-11
- This may become stale if Reactor v1 replaces today's schedule mechanics with triggers, but the ownership invariant should survive.

### 2026-02-09
- Task created from Convex security audit finding.

## Notes
Primary files: `convex/skills/builtIn/cancelSchedule.ts`, `convex/schedules/private.ts`, `convex/schedules/public.ts`.

Sources:
- [Security findings audit](../references/security-findings-audit.md)
- [DeepSec vulnerability scan](../references/deepsec-vulnerability-scan.md)
