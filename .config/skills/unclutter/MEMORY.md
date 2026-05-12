# Unclutter Memory

Durable decisions for future Unclutter passes. Keep this short; this is the persistent history.

## Decisions

- Read `tasks/README.md` as the task-system contract before changing tasks.
- Check `git status --short` first and ask Igor before continuing on top of a dirty worktree.
- Never stage, commit, amend, reset, or otherwise mutate Git review state.
- Touch `completed/` rarely. Completed tasks are mostly history.
- Preserve TickTick tags and source metadata. TickTick imports should carry `source:ticktick`, `ticktick-list:*`, and `ticktick-status:*` when known.
- TickTick child task rows should be real local filesystem subtasks under the parent task folder, not only a rendered checklist in the parent body.
- `ticktick-status:use-case` maps to the `ideas/` bucket.
- `ticktick-status:user-interface` stays in `inbox/` for triage.
- The root side-project directory is `ideas/`, not `side/`.
- Deepsec scanner output can stay public for now because Meseeks has no users yet.
- Keep nested folders with `_index.*` when they are real parent tasks or reference collections.
- Flatten grouping-only folders when tags or Organizer filters carry the organization.
- Reactor v1 is the main critical path. It includes the new core execution engine plus the broader v1/public-beta shift: pricing/accountability, branding, and product readiness.
- Current/v0 implementation references can live as children of a parent task when they are source material for that parent.
- Before deciding an implementation task is stale, read the current code path named by the task.
- Security/accountability findings can be grouped as deferred follow-ups when Reactor v1 is expected to replace the old mechanism. Keep details visible; do not force patches into old Reactor paths unless Igor asks.

## Current State Notes

- 2026-05-11 Unclutter moved open Meseeks TickTick imports by preserved TickTick board status.
