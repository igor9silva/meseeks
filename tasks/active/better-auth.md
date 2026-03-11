---
title: Finish Better Auth Migration
priority: high
tags: []
---

# Finish Better Auth Migration

## Context
We are migrating platform sign-in from Convex Auth to Better Auth inside Convex.

The stock Better Auth + Convex React bridge is not acceptable for this app as-is. It adds startup auth HTTP requests (`/api/auth/get-session` and `/api/auth/convex/token`) that conflict with the old Convex Auth behavior and make the app feel slower.

A custom Better Auth -> Convex bridge already removed the session request and the token-refresh loop, but Convex still forces one `/api/auth/convex/token` refresh after accepting a cached JWT.

## Objective
Ship Better Auth for platform sign-in without regressing the old Convex Auth startup behavior, or explicitly decide to revert platform sign-in back to Convex Auth if that cannot be achieved cleanly.

## Subtasks
- [ ] Keep shared auth config values in one source of truth across app, server, and Convex code.
- [ ] Preserve the custom Better Auth -> Convex bridge and verify the remaining startup auth behavior precisely.
- [ ] Decide whether to patch Convex auth refresh behavior for true zero-startup-request reloads or accept one forced refresh with explicit sign-off.
- [ ] Keep platform sign-in scope limited to Google for now; treat later SIWE support as a separate follow-up.

## Progress Log
### 2026-03-11
- Task rewritten after implementation work exposed the real constraint: Better Auth must match Convex Auth startup behavior closely enough for this app.
- Recorded that the stock Better Auth React bridge is not acceptable here because it adds extra startup auth/session HTTP requests.

## Notes
- `skills-only` OAuth providers remain separate work; see `tasks/backlog/skill-oauth-foundations.mdx`.
- If Better Auth cannot avoid the startup behavior regression without ugly patches, reverting primary platform sign-in back to Convex Auth is a valid outcome.
