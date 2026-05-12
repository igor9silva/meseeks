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
- DeepSec scan material belongs to the public high-priority security/accountability backlog effort, not `references/`.
- Keep nested folders with `_index.*` when they are real parent tasks or reference collections.
- Flatten grouping-only folders when tags or Organizer filters carry the organization.
- Reactor v1 is the main critical path. It includes the new core execution engine plus the broader v1/public-beta shift: pricing/accountability, branding, and product readiness.
- Current/v0 implementation references can live as children of a parent task when they are source material for that parent.
- Before deciding an implementation task is stale, read the current code path named by the task.
- Security/accountability findings can be grouped as deferred follow-ups when Reactor v1 is expected to replace the old mechanism. Keep details visible; do not force patches into old Reactor paths unless Igor asks.
- `private/tasks/active/migrate-ticktick/` is the canonical parent for the current task-system organization plus TickTick migration effort. Keep useful organize reports/import receipts under it instead of root `organize.md` / `organize/*`.
- Completed TickTick task import belongs under the private TickTick migration parent and must preserve activity/history before importing.
- `tasks/backlog/mdx-agent-skills.mdx` is a low-priority public idea, not active work.
- Grok 4.2 and Grok 4.3 support are separate public low-priority intelligence tasks; do not merge them.
- Imported aggregation parents with no real body should be removed after their children are classified.
- Useful image-only UI imports can become references when they are design inspiration; kill outdated UI references.
- Reactor v1 must preserve synchronous actions and multiple tool-call / multi-action execution as first-class behavior.
- Empty imported shells that only point at Reactor v1 concepts should be folded into Reactor v1 and deleted.

## Current State Notes

- 2026-05-11 Unclutter moved open Meseeks TickTick imports by preserved TickTick board status.
