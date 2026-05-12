---
title: Add abuse guardrails for transcribe action
priority: medium
tags: [security]
---

# Add abuse guardrails for transcribe action

## Context
`convex/magicRock/public.ts::transcribe` accepts arbitrary audio buffers and calls external paid APIs without payload-size limits or rate limiting. This increases cost and abuse risk.

## Objective
Protect transcription endpoints with strict limits and predictable failure behavior.

## Subtasks
- [ ] Enforce maximum input size for audio payloads before external calls.
- [ ] Add per-user and global rate limits for transcription requests.
- [ ] Return stable error codes/messages for limit violations.
- [ ] Add tests for oversized payloads and rate-limit exhaustion.
- [ ] Add observability counters/logs for rejected vs accepted requests.

## Progress Log
### 2026-05-11
- Moved under the security/accountability follow-up parent. This is a real abuse/accounting concern, but not a pre-Reactor-v1 focus while Meseeks has no users.

### 2026-02-09
- Task created from Convex security audit finding.

## Notes
Primary files: `convex/magicRock/public.ts`, plus new reusable rate-limit helper.
