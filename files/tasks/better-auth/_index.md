---
title: Finish Better Auth Migration
priority: high
tags: [auth, status:completed, class:task]
---

# Finish Better Auth Migration

We are migrating platform sign-in from Convex Auth to Better Auth inside Convex.

The stock Better Auth + Convex React bridge is not acceptable for this app as-is. It adds startup auth HTTP requests (`/api/auth/get-session` and `/api/auth/convex/token`) that conflict with the old Convex Auth behavior and make the app feel slower.

A custom Better Auth -> Convex bridge already removed the session request and the token-refresh loop, but Convex still forces one `/api/auth/convex/token` refresh after accepting a cached JWT.

## Objective
Ship Better Auth for platform sign-in without regressing the old Convex Auth startup behavior enough to make the app feel wrong.

## Subtasks
- [x] Keep shared auth config values in one source of truth across app, server, and Convex code.
- [x] Preserve the custom Better Auth -> Convex bridge and verify the remaining startup auth behavior precisely.
- [x] Keep platform sign-in scope limited to Google for now; treat later SIWE support as a separate follow-up.
- [x] Clean up the Better Auth migration code to match repo patterns instead of leaving migration-shaped sludge in the final auth flow.

## Progress Log
### 2026-03-11
- Task rewritten after implementation work exposed the real constraint: Better Auth must match Convex Auth startup behavior closely enough for this app.
- Recorded that the stock Better Auth React bridge is not acceptable here because it adds extra startup auth/session HTTP requests.

### 2026-03-16
- Landed the custom Better Auth -> Convex bridge, cleaned up the auth runtime/config layout, and brought the migration code back in line with the repo's actual patterns.
- Simplified auth-user syncing so it only writes fields the app currently uses instead of mirroring Better Auth state blindly.
- Kept a narrow `users.current` fallback from `identity.userId` to `authUserId` because the first Convex JWT after sign-in can arrive before the Better Auth `user.userId` bridge is present in the token payload.
- Task resolved after user review. If we want to remove that first-login fallback later, that is a separate follow-up, not unfinished migration work.

### 2026-03-18
- User explicitly confirmed Better Auth is finally done.
- Treat future auth changes as follow-up work, not as reopened Better Auth migration cleanup.

### 2026-04-25
- Follow-up auth tuning kept bootstrap cookie-only again so normal reloads no longer need a startup `/api/auth/convex/token` request.
- Clarified the rolling-session constraint: Convex websocket/query/mutation traffic cannot refresh the Better Auth browser session cookie; only `/api/auth` responses can do that.
- Landed the current compromise for platform auth: sparse background `/api/auth/convex/token` refresh on `visibilitychange` when the cached JWT is nearing expiry, with session lifetime fully env-driven again.

## Notes
- `skills-only` OAuth providers remain separate work; see `files/tasks/skill-oauth-foundations/_index.mdx`.
- Reverting primary platform sign-in back to Convex Auth was a valid fallback, but was not needed.
- Runtime session values are env-driven again. For the intended rolling-session behavior, use `JWT_SESSION_DURATION_MS=2592000000` and `JWT_SESSION_UPDATE_AGE_MS=86400000`.
