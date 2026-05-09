# Action Execution Model

The current implementation is the Reactor model documented in [`docs/reactor.md`](../../docs/reactor.md).

Short version:

- Public entry is `act()`.
- Reactor flow is `claim -> start -> execute -> finish -> react`.
- `blocked` is the single action status for human authorization.
- `task.energyBudget` is model-facing policy pressure, not locked account funds.
- Account money moves through action-local `reserveEnergy()` and `settleAction()`.
- Started actions are not cancelled; interruption marks them so they finish financially, skip `react()`, and disappear from future model history.
