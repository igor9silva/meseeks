---
title: Security and accountability follow-ups
priority: high
tags: [security]
---

# Security and accountability follow-ups

These are known security, authorization, billing, and abuse-control gaps that should stay visible, but they are not the current focus before Reactor v1.

The current reactor makes several of these hard to fix cleanly. Keep the concrete findings here so they can be either fixed after Reactor v1 lands or folded into the Reactor v1 design when the new core directly replaces the old mechanism.

## Current children

- [ ] Bind authorize(actionId) to the provided taskId (`bind-authorize-action-to-task.md`)
- [ ] Add abuse guardrails for transcribe action (`add-transcribe-abuse-guardrails.md`)
- [ ] Enforce ownership checks for schedule cancellation paths (`enforce-schedule-cancel-ownership.md`)
- [ ] Keep the DeepSec vulnerability scan attached as source material (`deepsec-vulnerability-scan.md`)

## Decisions

- Do not treat every DeepSec-derived task as urgent before Reactor v1.
- Keep unresolved concrete security/accountability findings grouped and visible.
- Read current code before deciding whether an implementation task is stale.
- If a finding is still real but the new Reactor will replace the mechanism, preserve it as a Reactor design requirement instead of forcing a patch into the old model.
