---
title: Resolve stale email allowlist policy
priority: medium
tags: [auth, security]
---

# Resolve stale email allowlist policy

The old security audit said the email/domain allowlist gate was effectively disabled. Current code has drifted: the old `isEmailAllowed` path is gone and `private/tasks/completed/remove-email-allowlist.md` says removing allowlist behavior was intentional, but the env schema still requires `ALLOWED_DOMAINS` and `ALLOWED_EMAILS`, and `users.ts` still comments that allowlist logic is centralized in `getCurrentUser`.

## Objective
Make the auth policy honest before public beta: either remove stale allowlist config/comments completely, or reintroduce a real server-side gate if Reactor v1/public launch needs one.

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
- [Security findings audit](../references/security-findings-audit.md)
- [DeepSec vulnerability scan](../references/deepsec-vulnerability-scan.md)
