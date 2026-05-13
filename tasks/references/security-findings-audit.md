---
title: Security findings
tags: [security]
---

# Security Findings Audit

Date: 2026-02-12
Scope: Convex backend, skills execution paths, and related access-control flows.

## Summary

This report captures security findings identified during the repository-wide scan.
The goal is to track fixes in a separate task without mixing with ongoing refactors.

## Findings

### [P0] Cross-task mutation risk in `moveTask`

- Issue: The skill-facing mutation path accepts any `taskId` and patches parent without ownership validation in the private mutation itself.
- Why this matters: If a tool call (or any internal caller path) is ever abused, it can move tasks outside user ownership boundaries.
- Evidence:
  - `skills/builtIn/moveTask.ts:10`
  - `skills/builtIn/moveTask.ts:22`
  - `convex/tasks.private.ts:598`
- Suggested fix:
  - Enforce owner check inside the private mutation used by internal calls.
  - Prefer passing only implicit task context for model-triggered operations (avoid arbitrary task IDs where possible).

### [P0] Cross-task schedule cancellation risk in internal cancel path

- Issue: The skill path accepts arbitrary schedule IDs and internal cancellation logic (`cancelSchedule`) does not validate schedule ownership.
- Why this matters: A malicious or malformed internal call could cancel another user’s schedule.
- Evidence:
  - `skills/builtIn/cancelSchedule.ts:11`
  - `skills/builtIn/cancelSchedule.ts:26`
  - `convex/schedules.private.ts:112`
- Suggested fix:
  - Validate that `schedule.owner` matches expected owner/user context in the internal mutation path.
  - Avoid exposing free-form schedule IDs to model tools unless strictly required.

### [P1] Allowlist gate is effectively disabled

- Issue: `isEmailAllowed(email)` always returns `true`.
- Why this matters: Auth policy appears present but is bypassed, which creates false confidence and broader access than intended.
- Evidence:
  - `convex/users.private.ts:233`
- Suggested fix:
  - Re-enable real allowlist checks using `ALLOWED_DOMAINS` / `ALLOWED_EMAILS`, or remove the dead-gate logic entirely.

### [P1] Partial redaction in public skill listing

- Issue: Public skills response redacts only `config.headers` for hard skills, but other sensitive config fields may still leak if secrets are stored outside headers.
- Why this matters: Secret-bearing values can still be exposed if future skill configs include credentials in URL/body template/param mappings.
- Evidence:
  - `convex/skills.ts:88`
- Suggested fix:
  - Introduce a dedicated public serializer for skills that allowlists safe fields.
  - Do not mutate DB docs in-place when sanitizing response payloads.

## Recommended Fix Order

1. Close both P0 authorization gaps (`moveTask`, schedule cancel path).
2. Reinstate (or remove) allowlist gate behavior explicitly.
3. Replace ad-hoc redaction with explicit safe-shape serialization for public skill payloads.

## Split Tasks

- [Enforce ownership checks for moveTask](../backlog/enforce-move-task-ownership.md)
- [Enforce ownership checks for schedule cancellation paths](../backlog/enforce-schedule-cancel-ownership.md)
- [Resolve stale email allowlist policy](../backlog/resolve-stale-allowlist-policy.md)
- [Prevent global skill secret exfiltration via getSkillDetails](../backlog/prevent-skill-secret-exfiltration.md)

## Validation Checklist for Follow-up Task

- Add regression tests covering cross-user task move and schedule cancel attempts.
- Add a security test asserting public skill payload never includes secret material.
- Verify all internal mutations used by tools enforce ownership/tenant boundaries.
