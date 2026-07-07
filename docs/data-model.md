# Data Model

The database controls identity, hierarchy, metadata, ledger rows, and realtime query shape. Object Storage controls file bodies and large blobs.

Object Storage is the source of truth for file bodies. Convex rows point at those bodies and record enough metadata to find, authorize, render, bill, and audit them.

## Identity

All durable rows are user-owned unless the row is explicitly global infrastructure metadata.

User ownership is always server-enforced. Unauthorized reads and writes return not-found style errors.

Human-authored work uses the user id as author. Reaction-authored work uses the action id that caused the reaction. There is no `system` author.

## Tables

### users

The user table keeps the auth bridge, identity cache, energy balance, and root pointer.

Fields:

- `authUserId`: external auth user id.
- `name`, `image`, `email`, `phone`: auth profile cache.
- `emailVerificationTime`, `phoneVerificationTime`: auth verification timestamps.
- `isAnonymous`: false for app-owned user rows.
- `energyBalance`: current usable energy balance.
- `root`: id of the user's root directory in `files`.

Indexes:

- `authUserId`
- `email`
- `phone`

### user_requests

User-submitted requests that need app/team follow-up.

Fields:

- `owner`: user id.
- `key`: request type.
- `message`: user-written request body.
- `context`: structured request context.

Indexes:

- no custom index.

### files

Stable identity and current state for files and directories.

Fields:

- `owner`: user id.
- `parent`: parent file id, or literal `root` for the user's root directory.
- `name`: local basename.
- `kind`: `directory` or `file`.
- `currentRevision`: current accepted revision id.
- `contentType`: MIME-ish content type for file bodies.
- `size`: current body size in bytes.
- `hash`: current body hash.
- `metadata`: small structured metadata used for rendering and navigation.
- `budget`: current budget/accounting state for this file or directory.
- `author`: user id or action id that authored the file row.

Indexes:

- `by_owner_parent_name`: owner, parent, name.

Path lookup walks `files` rows. Object Storage keys never encode VFS paths.

`.pro/` is represented as normal directory rows in the file tree. A direct child named `.pro` makes its parent directory a scope directory. The effective scope for any visible directory is the nearest ancestor directory that contains `.pro`. A `.pro` directory and every descendant under it resolve action root, budget, trigger scope, compile scope, action output placement, box reuse, and runtime inheritance to the directory that owns `.pro`.

Public file APIs are read-oriented plus root bootstrap. File operation skills do not have public `files.*` wrappers. Normal file creation, writes, moves, tags, untags, and uploads are Reactor actions started through `api.actions.act()`.

### file_tags

Current tag index for files.

Tags are current-state metadata, not the history source. Tag mutations create file revisions.

Fields:

- `owner`: user id.
- `file`: file id.
- `key`: tag key.
- `value`: tag value, absent for boolean/presence tags.

Indexes:

- `by_file_key`: file, key. Unique tag key per file.
- `by_owner_key_value`: owner, key, value.

### file_revisions

Immutable record of one file mutation.

Every file mutation creates a revision. Directory creation, directory rename, metadata edits, and tag edits are file mutations.

Fields:

- `owner`: user id.
- `file`: file id.
- `action`: action id that caused the mutation.
- `previousRevision`: prior revision id for this file.
- `changeKind`: `create`, `update`, `delete`, `rename`, `metadata`, or `tag`.
- `beforePath`: VFS path before the mutation.
- `afterPath`: VFS path after the mutation.
- `beforeHash`, `afterHash`: body hash before and after the mutation.
- `beforeSize`, `afterSize`: body size before and after the mutation.
- `storageKey`: Object Storage key for the resulting body while this revision is current.
- `contentType`: resulting content type.
- `patch`: full mutation patch when small enough for Convex.
- `patchStorageKey`: Object Storage key for large patch data.

Patch records are full and reversible. The model is Git commit-inspired, but it does not store a full Git tree. Reversing state means traversing the revision chain patch by patch.

Object liveness is based on current file pointers and explicit artifact pointers, not every historical `storageKey` value. Historical revisions keep storage keys as audit metadata even when the old body object has been deleted.

Indexes:

- `by_file`: file.
- `by_file_previousRevision`: file, previousRevision.
- `by_action`: action.
- `by_owner_file`: owner, file.

There are no durable `changes`, `changesets`, or file-mutation `transactions` tables in the core file model.

The action is the atomic apply boundary. One action can create zero or many file revisions. A single action cannot create multiple file transactions or checkpoints.

`changeset(action)` is a derived UI/query concept:

```txt
all file_revisions where action = action.id
```

If a long-running agent needs checkpoints, each checkpoint is a new action caused by the parent agent/session action and carrying the same `spark`.

### actions

Durable ledger row for work.

Every mutation and provider call is attributable to an action. Actions run in exactly one scope directory.

Fields:

- `owner`: user id.
- `root`: effective scope directory where the action runs.
- `index`: per-root monotonic action number.
- `author`: user id for direct human actions or action id for reactions.
- `spark`: chain-starting marker. Direct human spark actions use `self`; reactions carry the originating action id.
- `skill`: action/skill key.
- `intelligence`: selected intelligence key when relevant.
- `input`: validated action input.
- `status`: existing action status union.
- `claimedAt`, `startedAt`, `interruptedAt`, `finishedAt`: lifecycle timestamps.
- `scheduledFunctionId`: Convex scheduled function id created by `claimNext()`.
- `output`: file id for the primary `.mdx` output file.
- `costs`: cost entries charged by this action.
- `warnings`: non-fatal runtime warnings.

Indexes:

- `by_root_index`: root, index.
- `by_root_status`: root, status.
- `by_owner_root`: owner, root.
- `by_author`: author.
- `by_spark`: spark.
- `by_status`: status.

Actions use the union-schema format already established in the app. Lifecycle state that does not belong in the status union is represented with timestamps such as `claimedAt` and `interruptedAt`.

Normal Reactor action rows are inserted as `status: "enqueued"`. No normal action creation helper accepts caller-controlled status. `claimNext()` records claim-time preparation in `action_details`, sets `claimedAt`, and stores `scheduledFunctionId` while leaving the action enqueued. The perform load mutation is the only path that sets `status: "running"`. Settle is the only normal Reactor path that sets `status: "succeeded"`, `status: "failed"`, or `status: "skipped"`.

Claim-time unclaimable actions are the narrow exception to the normal settle path. If an enqueued action cannot be claimed because its skill is unknown, its input is invalid, its stored skill config is invalid, its preparation references missing resources, its expected file revision is stale, or preparation fails with a claimability error, Reactor records an error detail, stores the warning on the action, marks it `skipped`, and continues claiming the queue. This does not run the skill and does not enter `perform`.

Direct human spark actions use `spark: self`. Reaction actions must provide the existing action id that started the chain.

`input` is a structured JSON payload. Id values inside `input` use `Id` suffixes when they are not protected by a table-specific schema, such as `fileId`, `parentId`, `triggerId`, and `expectedRevisionId`.

Root bootstrap is a narrow exception to the normal lifecycle because a user root must exist before an action can run. Bootstrap inserts one resolved action with `skill: "bootstrap"`, `status: "succeeded"`, `spark: "self"`, and `author` equal to the user. That action authors the root directory creation revision and causes one normal enqueued `seed` reaction. `bootstrap` is not a callable skill and is not exposed through `api.actions.act()`.

Seed writes runtime source files and then enqueues the first `compile` reaction. Seed writes page entries at `/page.tsx` and `/page.css`, and control source under `/.pro/`. That direct `.pro` child makes the user root a scope directory. Seed does not insert `skills`, `triggers`, or `pages` rows. Those rows are runtime projections created by `compile`.

Root maintenance is also the idempotent entrypoint for synchronizing code-owned instinct projections into `skills`. Existing users with an existing root still run the same maintenance path so the callable skill list does not depend on a previous claim having happened.

### action_details

Technical details for action execution.

Action details include pre-run preparation, post-call receipts, file/debug records, trigger records, and errors. User-visible action outputs live in files, not only in details.

Preparation details are pre-run context, not receipts. They are persisted during `claimNext()` and replaced on claim retry for the same action. Provider receipts are post-call provider-reported facts and are the audit source for provider usage and charging.

Fields:

- `owner`: user id.
- `action`: action id.
- `createdAt`: timestamp.
- preparation fields: `kind: preparation`, `skillKind`, `skill`, `preparedAt`, and skill-kind-specific prepared context.
- provider receipt fields: `kind: provider`, provider key, model, request, response, usage, and cost.
- box receipt fields: `kind: box`, provider, provider box id, command, exit code, logs, and changed paths.
- trigger receipt fields: `kind: trigger`, trigger id, trigger source file/path/hash, source action, compile action/timestamp, matched revisions/paths, proposed actions, accepted actions, and errors.
- reaction receipt fields: `kind: reaction`, proposed actions and accepted actions for direct non-trigger reactions such as `seed -> compile`.
- file receipt fields: `kind: file`, file id, revision ids, paths, and warnings.
- upload receipt fields: `kind: upload`, upload ticket action id, parent directory, final file name, content type, size, hash, checksum, staged storage key, signed upload URL, and expiry timestamp.
- error receipt fields: `kind: error`, code, message, and stack when available.

Indexes:

- `by_action`: action.
- `by_owner_action`: owner, action.
- `by_kind`: kind.

### triggers

Durable Reactor rules.

Trigger rows are runtime projections. Compile creates and updates them from trigger source files. Seed and normal trigger-authoring skills write trigger source files under `/.pro/triggers/*.ts`; they do not install trigger rows directly.

Triggers are union typed. A trigger may point at a file, but a trigger row is the durable rule.

Shared fields:

- `owner`: user id.
- `root`: scope directory.
- `author`: action id that authored the trigger.
- `kind`: `code`, `mutation`, `action`, or `schedule`.
- `status`: `enabled`, `disabled`, or `errored`.
- `sourceFile`, `sourcePath`, `sourceHash`: runtime source provenance when the trigger is compile-derived.
- `compiledBy`, `compiledAt`: compile action that produced the derived row.
- `maxUses`: optional finite use cap. Missing means unlimited.
- `remainingUses`: remaining runs for finite-use triggers.
- `lastRunAt`: last successful run timestamp.
- `lastError`: last visible error.
- `runCount`: total runs.

Code trigger fields:

- `file`: QuickJS-executable file id.

Mutation trigger fields:

- `events`: file mutation kinds this trigger observes.
- `pattern`: path or tag matcher.
- `reactions`: action proposals scheduled when the trigger matches.

Mutation triggers match actions settled in the trigger scope or a normal descendant directory inside that scope. Reaction actions run at the trigger root. A trigger row's `author` records who authored the rule. A reaction action caused by the trigger is authored by the action that matched the trigger. Trigger receipts copy the trigger source file/path/hash and compile provenance into `action_details` at match time so the cause remains inspectable even if the trigger row changes later.

Action trigger fields:

- `skills`: action/skill keys this trigger observes.
- `statuses`: action statuses this trigger observes.

Schedule trigger fields:

- `schedule`: one-time timestamp or recurring expression. Timezone is embedded in timestamp values.
- `nextRunAt`: next scheduled run timestamp.
- `scheduledFunctionId`: Convex scheduler id.

Indexes:

- `by_root_kind_status`: root, kind, status.
- `by_owner_root`: owner, root.
- `by_nextRunAt`: nextRunAt.
- `by_author`: author.

### boxes

Compute provider lifecycle metadata.

Boxes provide execution. They never own canonical file bodies.

Fields:

- `owner`: user id.
- `root`: mounted scope directory.
- `provider`: `daytona`.
- `providerBoxId`: provider id.
- `status`: `creating`, `ready`, `busy`, `stopped`, or `failed`.
- `lastAction`: last action id that used the box.
- `lastStartedAt`, `lastStoppedAt`: lifecycle timestamps.
- `metadata`: provider lifecycle/debug metadata.

Indexes:

- `by_root_status`: root, status.
- `by_owner_root`: owner, root.
- `by_providerBoxId`: providerBoxId.

### transactions

Energy transactions ledger.

Fields:

- `owner`: user id.
- `kind`: `free energy`, `top up`, `action cost`, `storage cost`, or `refund`.
- `value`: signed energy amount.
- `action`: action id when the entry is caused by an action.
- `file`: file id when the entry is tied to stored file state.
- `topUp`: top-up id when the entry applies a paid deposit.
- `description`: short human-readable label.

Indexes:

- `by_owner`: owner.
- `by_action`: action.
- `by_file`: file.
- `by_topUp`: topUp.

Storage billing remains unsettled in [Debt#4](./debts.md#debt4-storage-billing).

Transaction rows are persisted through the transactions domain module. Other backend modules record energy movement through semantic helpers instead of writing `transactions` directly.

### skills

Runtime action definitions.

A skill defines an action Reactor can perform. The table is the runtime projection consumed by action validation, Reactor claim, UI lists, and runtime inspection.

File-authored skills are compiled from `.ts` files under `.pro/skills/`. Instincts are code-owned skills registered into this table as `source: instinct`; code remains their canonical source. Root maintenance and Reactor claim both synchronize those instinct rows idempotently.

Fields:

- `key`: skill identity. File-authored keys are path-like and may include scoped segments such as `@tavily/search`.
- `description`: human-readable skill description.
- `inputSchema`: serialized schema string describing accepted input.
- `outputSchema`: serialized schema string describing expected output.
- `preApprovedCost`: human authorization threshold.
- `kind`: configured skill kind (`think`, `request`, `execute`) or the instinct key for `source: instinct` rows.
- `owner`: `isPro` or user id.
- `author`: `isPro`, user id, or action id.
- `source`: `instinct`, `file`, or `manual`.
- `root`: scope directory for directory-scoped compiled rows.
- `sourceFile`, `sourcePath`, `sourceHash`: file source provenance for compile-derived rows.
- `compiledBy`, `compiledAt`: compile action that produced the row.
- `isHidden`: whether the skill is hidden from runtime/UI lists.
- `priority`: visual sort priority.
- `cost`: fixed energy cost or `dynamic`.
- `config`: intelligence configuration for `think`, HTTP configuration for `request`, or execution configuration for `execute`.

Indexes:

- `by_owner_kind`: owner, kind.
- `by_owner_key`: owner, key.
- `by_owner_root_key`: owner, root, key.

Code-owned instincts expose `inputSchema` and `outputSchema` as serialized schema strings in this table, generated from Zod schemas in code.

Instinct keys are reserved. File-authored and manual skills cannot shadow code-owned instincts.

`prepareUpload` and `commitUpload` are instincts. They are callable skills in the same runtime projection as other instincts, but they do not create an uploads table. Upload preparation is recorded as an `action_details` receipt, and the canonical file row exists only after `commitUpload` settles successfully.

Compile infers file-authored skill keys from paths. Declarations do not repeat `key`. For example:

```txt
/.pro/skills/@tavily/search.ts -> @tavily/search
```

Directory-scoped compiled rows use `by_owner_root_key`. Unscoped rows are global/manual fallbacks. Public entrypoints resolve a visible directory to its effective scope before action creation and projection queries. Reactor receives that action root and looks up the effective skill row directly; it does not resolve parent directories during claim or perform. The skills domain also exposes a scope-scoped callable list for UI and runtime inspection so action composers do not have to merge global, manual, and compiled skills client-side.

Serialized skill schemas currently represent Convex table-specific ids as strings. Serialized fields that carry ids use `Id` suffixes, for example `fileId`, `parentId`, `actionId`, and `expectedRevisionId`. Reactor performs table-specific id parsing while executing the skill. See [Debt#7](./debts.md#debt7-serialized-skill-schema-id-types).

### pages

Compiled page projections.

Pages are derived from `page.tsx` files. There is no `routes` table.

Page rows are readable by root and route so renderers, inspectors, and developer surfaces can show which source file owns a page and which compile action produced it. Route rendering from these projections is not complete yet.

Fields:

- `owner`: user id or `isPro`.
- `root`: scope directory whose compile produced the page.
- `file`: source file id.
- `route`: rendered route path.
- `sourcePath`, `sourceHash`: source provenance.
- `compiledBy`, `compiledAt`: compile action that produced the row.
- `status`: `enabled`, `disabled`, or `errored`.
- `diagnostics`: compile diagnostics for the page.

Indexes:

- `by_owner_root_route`: owner, root, route.
- `by_file`: file.

### top_ups

One-time energy deposit checkout state.

Fields:

- `owner`: user id.
- `author`: user id or action id that authored the top-up.
- `amount`: usable energy.
- `fee`: fixed app cut charged on deposit.
- `totalCharged`: amount plus fee.
- `status`: `waiting`, `confirmed`, `failed`, or `discarded by user`.
- `paymentUrl`: checkout URL.
- `paymentId`: provider checkout id.
- `provider`: `polar`.

Indexes:

- `by_status_owner`: status, owner.
- `by_paymentId`: paymentId.

### polar_events

Polar webhook receipt rows.

Fields:

- `owner`: user id when known.
- `action`: action id when the event belongs to an action.
- `type`: Polar event type.
- `eventId`: Polar event id when available.
- `data`: Polar payload after secret stripping.
- `receivedAt`: timestamp.

Indexes:

- `by_eventId`: eventId.
- `by_owner`: owner.
- `by_action`: action.

Polar event rows are persisted through the Polar events domain module. Other backend modules record Polar webhook receipts through semantic helpers instead of writing `polar_events` directly.

## Tables Not In The Product Model

There are no `heads`, `workspaces`, `routes`, `tasks`, `components`, `schedules`, `drafts`, `changes`, `changesets`, file-mutation `transactions`, or `subscriptions` tables in the canonical model.

Task-like behavior is represented through directories, tags, files, renderable page files, triggers, and actions. Component-like behavior is represented through renderable files. Schedule behavior is represented through schedule triggers.
