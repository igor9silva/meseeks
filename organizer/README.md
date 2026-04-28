# Organizer

Task explorer for generated Meseeks task indexes.

This app is intentionally separate from the main Meseeks app. It reads generated task index files from the repo root and keeps its own TanStack Start/Vite setup under `organizer/`.

## Maintenance Model

Organizer is fully vibecoded and expected to stay that way. Codex is the sole maintainer, so the code should be optimized for future Codex passes: clear file names, small modules, boring boundaries, and enough tracked local notes that the next run does not need to rediscover the same context.

There is no tracked `AGENTS.md` for this app. If one exists locally, it is intentionally gitignored; keep durable Organizer-specific maintenance lore here instead.

## Commands

Run from `organizer/`:

```bash
bun run dev
bun run check
bun run typecheck
bun run build
```

Run from the repo root:

```bash
bun run organizer
```

## Data

Organizer reads these generated files:

```text
../private/tasks/.generated/tasks.meta.json
../private/tasks/.generated/tasks.lookup.json
../private/tasks/.generated/tasks.graph.json
../private/tasks/.generated/tasks.content.json
```

The app does not own index freshness. The root config watcher/index generator owns that, and Organizer should surface missing or stale index diagnostics instead of silently rebuilding as part of normal read flows.

## Shape

```text
src/components/tasks/
  TaskExplorerPage.tsx       route-level state and query wiring
  TaskExplorerSidebar.tsx    filters, facets, task list
  TaskDetailView.tsx         selected task detail and task actions
  CreateTaskView.tsx         task creation form
  taskExplorerTypes.ts       shared component-facing types
  taskExplorerUtils.ts       small UI helpers and constants

src/server/
  taskExplorer.ts            TanStack Start server functions
  taskExplorerSchemas.ts     server-function input schemas
  taskExplorerReadModel.ts   filtering, scoring, facets, detail projection
  taskIndexRepository.ts     generated index loading/cache
  taskMutationRepository.ts  filesystem mutations and index rebuild rollback
```

## Notes

The Vite devtools event bus is pinned to `42070` in `vite.config.ts`. TanStack's default `42069` commonly collides with the root app when both are open.
