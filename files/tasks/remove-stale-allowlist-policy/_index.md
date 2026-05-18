---
title: Remove stale email allowlist policy
priority: low
tags: [status:backlog, class:task, debt]
---

# Remove stale email allowlist policy

The old security audit said the email/domain allowlist gate was effectively disabled. Current code has drifted: the old `isEmailAllowed` path is gone and `private/files/tasks/remove-email-allowlist/_index.md` says removing allowlist behavior was intentional, but the env schema still requires `ALLOWED_DOMAINS` and `ALLOWED_EMAILS`, and `users.ts` still comments that allowlist logic is centralized in `getCurrentUser`.

## Objective
Remove stale allowlist config/comments completely.

## Subtasks
- [ ] Decide whether Meseeks v1 should have an account allowlist at all.
- [ ] If no, remove `ALLOWED_DOMAINS` and `ALLOWED_EMAILS` from env schema and stale comments.
- [ ] If yes, enforce the allowlist at the server-side auth/user creation boundary.
- [ ] Add tests or a manual verification note for the chosen behavior.

## Progress Log
### 2026-05-12
- Split from the security findings audit, but reframed as policy cleanup because current code indicates allowlist removal was deliberate.

## Notes
Sources:
- [Security findings audit](../../references/security-findings-audit/_index.md)
- [DeepSec vulnerability scan](../../references/deepsec-vulnerability-scan/_index.md)
