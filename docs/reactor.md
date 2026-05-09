# Reactor

The reactor is the action engine. It owns action preflight, execution, accounting settlement, and reactions.

## Flow

```mermaid
flowchart TD
    ACT["act()"] --> CLAIM["claim"]
    CLAIM --> PREPARE["prepare action_details + computeMaxCost()"]
    PREPARE --> GATE{"policy + account + authorization"}
    GATE -->|task energy blocked| BUDGET["finish failed + requestBudget"]
    GATE -->|account funds blocked| FUNDS["finish failed"]
    GATE -->|human needed| BLOCKED["status blocked"]
    BLOCKED -->|authorize()| CLAIM
    GATE -->|ok| RESERVE["reserveEnergy + set running + claimedAt + scheduledFunctionId"]
    RESERVE --> START["start + startedAt"]
    START --> EXECUTE["buildContext(details) + execute tool"]
    EXECUTE --> FINISH["finish: settleAction + costs + finishedAt"]
    FINISH --> INTERRUPTED{"interruptedAt?"}
    INTERRUPTED -->|yes| HIDE["skip react + hide from future history"]
    INTERRUPTED -->|no| REACT["react()"]
    HIDE --> CLAIM
    REACT --> CLAIM
    BUDGET --> CLAIM
    FUNDS --> CLAIM
```

## Responsibilities

- `claim`: find the next `enqueued` action, persist durable action details, compute `maxCost`, enforce task energy policy, check account balance, check authorization, reserve account energy, mark the action `running`, and schedule `_perform`.
- `start`: mark `startedAt` when the scheduled Convex action begins. Stale scheduled calls return without doing work.
- `execute`: rebuild the runtime context from `action_details`, run the skill, and return result plus actual costs.
- `finish`: settle the reservation against actual costs, update task energy pressure, persist terminal action state, and call `react()` unless the action was interrupted.
- `react`: enqueue result reactions through the private action helper; public vocabulary stays `act()`.

## Accounting

`task.energyBudget` is policy, not a wallet. It remains visible to the model as pressure: `total`, `spent`, and `available`. `available` may go negative inside the task buffer. User-account accounting happens through action-local reservations:

- `maxCost`: worst-case action cost, stored without policy buffer.
- `reservedEnergy`: amount held from the user account for this action.
- `reservedAt`, `settledAt`: reservation lifecycle timestamps.
- `settlementDelta = reservedEnergy - actualCost`: positive refunds unused reserve; negative debits extra and logs a warning.

## Interruption

Convex actions are treated as non-cancellable after `startedAt`. Stopping a started action sets `interruptedAt` and `interruptedBy`; the action still finishes financially, but `react()` does nothing and future model history filters it out. If a running action has not started yet, stop can finish it as `skipped` for free.

## Files

- `apps/pro-web/convex/reactor.ts`: Convex entrypoints and the readable claim/start/finish/react orchestration.
- `apps/pro-web/convex/reactor.private.ts`: scheduled action runtime.
- `apps/pro-web/convex/reactor.preflight.ts`: durable details, `computeMaxCost()`, task policy, account and authorization gates.
- `apps/pro-web/convex/reactor.accounting.ts`: reservation and settlement.
- `apps/pro-web/convex/reactor.context.ts`: `buildContext()` from durable action details.
