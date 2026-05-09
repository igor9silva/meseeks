# Action Execution Flow

The current flow diagram lives in [`docs/reactor.md`](../../docs/reactor.md).

Implementation map:

- UI composer and task creation call `api.action.act`.
- The private action enqueue helper inserts `enqueued` actions and asks the reactor to claim work.
- `reactor._claimAndScheduleNext` performs durable preflight, reserves energy, marks `running`, and schedules `_perform`.
- `reactor._start` marks `startedAt` when Convex actually begins the scheduled action.
- `reactor.private.perform` rebuilds context from `action_details`, executes the tool, and calls `_finish`.
- `reactor._finish` settles accounting, persists terminal state, and calls `react()` unless interrupted.
