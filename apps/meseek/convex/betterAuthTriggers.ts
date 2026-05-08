import { betterAuthComponent } from './betterAuth/component';

const betterAuthTriggers = betterAuthComponent.triggersApi();

// better auth wants real convex function handles in `authFunctions`, not plain
// closures. `triggersApi()` turns the callbacks defined in
// `betterAuth/component.ts` into internal mutations, and this root module
// re-exports those handles so `component.ts` can reference them via
// `internal.betterAuthTriggers.*`.
export const _onCreate = betterAuthTriggers.onCreate;

// same bridge for user updates coming from the component-owned better auth
// tables.
export const _onUpdate = betterAuthTriggers.onUpdate;
