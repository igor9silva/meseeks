# Unclutter Memory

Durable decisions for future Unclutter passes. Keep this short; this is the persistent history.

## Decisions

- Read `tasks/README.md` as the task-system contract before changing tasks.
- Check `git status --short` first and ask Igor before continuing on top of a dirty worktree.
- Never stage, commit, amend, reset, or otherwise mutate Git review state.
- Touch `completed/` rarely. Completed tasks are mostly history.
- Preserve TickTick tags and source metadata. TickTick imports should carry `source:ticktick`, `ticktick-list:*`, and `ticktick-status:*` when known.
- `ticktick-status:use-case` maps to the `ideas/` bucket.
- `ticktick-status:user-interface` stays in `inbox/` for triage.
- The root side-project directory is `ideas/`, not `side/`.
- Deepsec scanner output can stay public for now because Meseeks has no users yet.
- Keep nested folders with `_index.*` when they are real parent tasks or reference collections.
- Flatten grouping-only folders when tags or Organizer filters carry the organization.

## Current State Notes

- 2026-05-11 Unclutter moved open Meseeks TickTick imports by preserved TickTick board status.
