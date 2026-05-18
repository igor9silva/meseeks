---
title: Bind authorize(actionId) to the provided taskId
priority: high
tags: [security, status:backlog, class:task]
---

# Bind authorize(actionId) to the provided taskId

Public `authorize` checks ownership for the provided `taskId`, but internal `_authorize` updates by `actionId` without verifying `action.taskId === taskId`. This mismatch can allow unauthorized action approval if IDs are guessed or leaked.

## Objective
Guarantee the authorize flow is task-scoped and cannot mutate actions from other tasks.

## Subtasks
- [ ] Add an explicit `action.taskId === taskId` guard in internal authorization flow.
- [ ] Fail closed when task and action do not match.
- [ ] Add regression tests for mismatched task/action IDs.
- [ ] Re-check public caller path to ensure consistent error behavior.
- [ ] Review related mutation paths that accept both task and action IDs.

## Progress Log
### 2026-05-12
- Split back out as a standalone public security task. Keep visible until Reactor v1 either replaces this path or preserves the invariant directly.

### 2026-05-11
- Current code still appears to have this gap: `apps/meseeks/convex/action.private.ts::authorizeAction` loads by `actionId` and patches without checking `action.taskId === taskId`.
- Keep as a visible security/accountability follow-up and fold the invariant into Reactor v1 if the old authorization path is replaced.

### 2026-02-09
- Task created from Convex security audit finding.

## Notes
Primary files: `convex/action/public.ts`, `convex/action/private.ts`.
