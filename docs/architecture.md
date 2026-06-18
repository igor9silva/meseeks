# Architecture

PRO is a controlled environment for safely scaling automations. It provides a virtual filesystem, a safe code-execution environment, and a ledgered action runtime.

Everything is traceable, reversible, and accountable.

## Foundation

PRO uses:

- Convex for auth-aware metadata, realtime queries, actions, revisions, triggers, payments, and control plane state;
- Object Storage as the source of truth for file bodies;
- Reactor as the internal action lifecycle engine;
- compile as the ledgered bridge from file-authored runtime source into derived runtime rows;
- Magic Rock as the intelligence/provider boundary;
- boxes for compute;
- file conventions for pages, task-like surfaces, runtime control source, instructions, action outputs, and renderable outputs.

The core loop:

```txt
human acts from a visible directory
PRO resolves the effective scope directory
the action is enqueued
the action may call intelligence or execute code in a box
the action may propose file mutations
Reactor validates and applies canonical mutations
file revisions are recorded
runtime source changes can compile derived skills, triggers, and pages
triggers may enqueue follow-up actions (reactions)
the user can inspect and audit the full chain
```

Runtime source is authored as files. Skill definitions, trigger definitions, pages, and styles are files first. Compile reads those files, validates the narrow supported declarations, and writes derived runtime projections. Reactor consumes those projections; it does not recursively resolve the file tree while claiming or performing actions.

The bootstrap chain is:

```txt
bootstrap -> seed -> compile
```

Bootstrap creates the user root directory and enqueues `seed`. Seed creates initial runtime source files only: `/page.tsx`, `/page.css`, `/.pro/settings.json`, `/.pro/triggers/compile-on-runtime-source-change.ts`, and starter `/.pro/skills/*.ts` files. The root therefore has a direct `.pro/` child and is always a scope directory. Seed then enqueues `compile` directly as a reaction. Trigger rows, skill rows for file-authored skills, and page rows are created by `compile`, not by seed.

## File Tree

Files and directories are one tree.

A directory is a file-like node that can have children.

The database owns:

- stable file identity;
- parent/child relationships;
- user-visible paths;
- current revision pointers;
- metadata needed for efficient lists and rendering;
- tags;
- budget/accounting state;
- action, revision, and trigger relationships.

Object Storage is the source of truth for every file body. Convex owns file identity, directory hierarchy, metadata, and current revision pointers. Hot cached text in Convex is a cache, not canonical storage.

Public file APIs expose file reads, tree reads, revision reads, and root bootstrap. They do not expose skill-backed file operations. Creating, writing, moving, tagging, untagging, thinking, requesting, executing, interrupting, preparing uploads, and committing uploads all start through `api.actions.act()`.

### Scope Marker And Control Directory

`.pro/` is the control directory for the directory that contains it and the marker that makes that directory an action scope.

User/domain content lives in the owning directory. Runtime control source and support files live under `.pro/`:

```txt
/foo/.pro/settings.json
/foo/.pro/skills/*.ts
/foo/.pro/triggers/*.ts
/foo/.pro/components/*.tsx
/foo/.pro/actions/{actionIndex}-result.mdx
```

Visible directory and scope directory are different concepts:

- visible directory: the directory the user is browsing and where explicit explorer operations target;
- scope directory: the nearest ancestor directory that contains a direct `.pro/` child.

Every path has an effective scope because the user root always has `.pro/`. `.pro/` and every descendant inside it are transparent for scope resolution. If the current path is `/foo/.pro/...`, the scope directory is `/foo`, not `/foo/.pro`.

Examples:

```txt
/foo/.pro/                         -> /foo is a scope
/foo/uploads/audio.ogg             -> /foo if /foo/.pro exists and /foo/uploads/.pro does not
/foo/bar/baz/file.md               -> /foo if /foo/.pro is the nearest marker
/foo/bar/.pro/                     -> /foo/bar becomes a scope
/foo/bar/baz/file.md               -> /foo/bar after /foo/bar/.pro exists
/foo/.pro/skills/example.ts        -> /foo
```

Budget lookup, trigger scope, compile scope, action output placement, box reuse, runtime inheritance, and action indexing use the scope directory.

Page entry files stay outside `.pro/`:

```txt
/foo/page.tsx
/foo/page.css
```

`page.tsx` defines the render entry for `/foo`, so it belongs at the directory root. `page.css` stays beside it as the visible style entry for that page/directory. Supporting render implementation files belong in `.pro/components/`. If a component is meant to be addressable as its own page, it gets its own directory with its own `page.tsx`.

Compile for a scope scans that scope's runtime source and normal descendant directories, but it does not descend into a child directory that has its own `.pro/` marker. The child scope compiles itself.

## Object Storage

Object Storage is mandatory.

Current file body keys are opaque:

```txt
{envRootPrefix}/{userId}/{revisionStorageId}
```

The key does not encode the VFS path. Directory hierarchy lives in Convex so moving or renaming a file is a metadata mutation, not an Object Storage rewrite.

Object Storage stores the current accepted body for every live file revision. Historical reversibility comes from revision patch data and artifact pointers, not from keeping a path-shaped copy of every old full body.

If an Object Storage write succeeds but the following Convex mutation fails, Reactor deletes the just-uploaded body immediately. A process crash between upload and cleanup can leave an orphan object; see [Debts](./debts.md).

Large browser uploads use Reactor actions without sending bytes through Convex mutation arguments:

```txt
prepareUpload action -> browser upload() PUT -> commitUpload action
```

`prepareUpload` is an instinct. It validates the target directory during claim, creates an opaque staged Object Storage key, signs a short-lived PUT URL constrained by an S3 SHA-256 checksum, and records an upload ticket in `action_details`. It does not create a file row.

The browser-side `upload()` helper hashes the file locally, computes the S3 base64 SHA-256 checksum, starts `prepareUpload` through `api.actions.act()`, uploads bytes directly to Object Storage with `x-amz-checksum-sha256`, then starts `commitUpload` through `api.actions.act()`.

`commitUpload` is an instinct. It loads the upload ticket during claim, verifies the ticket action belongs to the same owner and succeeded, HEADs the staged object during perform, verifies size and provider-reported checksum when available, copies the object server-side to the canonical opaque key shape, and returns a file creation proposal. Settle creates the canonical file row and `file_revisions` row. `commitUpload` does not download the staged object into Convex memory.

The Object Storage bucket must allow browser CORS preflight for signed `PUT` requests from app origins, including the `content-type` and `x-amz-checksum-sha256` request headers. CORS is not write authorization; the signed URL remains the write capability.

Staged upload objects are not canonical. This implementation leaves staged objects for Object Storage garbage collection instead of adding a third Convex context crossing after settle.

Composer uploads are normal user/domain content. They default to an `uploads/` directory inside the effective scope directory. If the user is browsing `/foo/bar` and `/foo/bar` is not a scope, composer attachments still go to `/foo/uploads/`. Explorer-style upload-here controls can target the visible directory, while the action root still resolves to the nearest scope directory.

## Revisions

Every file mutation creates a revision.

Revision records contain the full patch for each mutation. The model is inspired by Git commits, but it does not store full Git trees and Git is not canonical storage.

The revision ledger documents every change fully. Reversing state is always possible, but it means walking the revision chain patch by patch. The primary goal is complete accountability for every mutation, not cheap arbitrary checkout.

- create records include enough after-state to remove the created file;
- update records include patch data and previous revision pointers;
- delete records include enough before-state to restore the deleted file;
- rename records include before and after paths;
- metadata and tag records include previous and next values.

Folder creation is a file mutation and creates a revision. A directory mutation is incomplete if only the file row changes.

## Actions

Actions are the ledger of work.

Every action runs in exactly one scope directory. The schema field is still named `root`; its value is the effective scope directory. The scope directory is the runtime/context boundary for:

- file lookup;
- default trigger scope;
- budget lookup;
- box reuse;
- action indexing;
- output file placement.

Public entrypoints may receive a visible directory. They resolve it to the effective scope before enqueueing, listing actions, listing compiled projections, claiming work, checking budget, matching triggers, placing outputs, or reusing boxes. File operations still target their explicit file parent when they create, upload, or move files.

Action records include:

- owner;
- root;
- per-root index;
- author;
- spark;
- skill/action key;
- intelligence key when relevant;
- input;
- lifecycle timestamps;
- output file;
- details;
- costs;
- file revisions.

Large action outputs become files, usually `.mdx` output files under:

```txt
.pro/actions/{actionIndex}-result.mdx
```

The primary action output field points to a file. It is not inline text.

The public action API is:

```txt
api.actions.act({ actions: [{ root, skill, intelligence, input }] })
```

`act()` is a Convex mutation. It accepts a non-empty action list. Starting one action means passing a one-item list. It performs app-level authorization and input validation before inserting each action: authenticated user, access to the requested visible directory or effective scope, callable skill, valid input, and valid intelligence when relevant. It inserts every action with `status: "enqueued"`, then directly calls Reactor `claimNext()` for the affected roots before returning the action ids. It does not call providers, execute box work, mark actions running, or settle actions.

Frontend UI calls `act()` through a TanStack Mutation wrapper so pending and error states are explicit. The wrapper does not create a second backend API shape; it still calls `api.actions.act({ actions })`.

No public domain-specific mutation may enqueue or perform a skill as a shortcut around `act()`.

The lifecycle is:

```txt
act -> claimNext -> perform load -> perform -> settle
```

`claimNext()` is the Reactor claim path. It finds the next eligible `enqueued` action for a root, resolves the callable skill, validates input, runs the skill-kind preparation step, persists preparation to `action_details`, checks runtime/budget/provider constraints that exist in the current runtime, sets `claimedAt`, schedules `perform`, stores `scheduledFunctionId`, and leaves the status as `enqueued`.

Claim-time unclaimable actions are resolved as `skipped` before `perform`. Unknown skills, invalid input, invalid stored skill config, missing claim-time resources, stale write revisions, and failed preparation are claimability failures. Reactor records a visible error detail and warning, marks the action `skipped`, and continues to the next enqueued action. Unexpected database or runtime errors still throw.

Preparation is pre-run context, not a receipt. It is union typed by skill kind and records the frozen context `perform` must use. Claim retry replaces the existing preparation detail for the action instead of duplicating it.

`perform` is an internal action. It has exactly two Convex context crossings:

1. one load mutation at the beginning;
2. one settle mutation at the end.

The load mutation validates the claimed action, loads the prepared context from `action_details`, and moves the action to `status: "running"`. After that, `perform` uses the frozen prepared context. It may call intelligence providers, make HTTP requests, stage Object Storage bodies, read Object Storage bodies, or build file mutation proposals. Provider receipts, warnings, logs, output metadata, file mutations, trigger metadata, and errors are kept in memory until settle.

`settle` is the only resolution path. It applies file mutations, writes the primary `.mdx` result file, records file revisions, appends post-call receipts and debug details to `action_details`, stores warnings, marks the action `succeeded`, `failed`, or `skipped`, enqueues trigger reactions, and calls `claimNext()` when queued work continues.

Root directory bootstrap is the one direct file creation exception. A signed-in user must have a root directory before `act()` can run, because actions need a fallback scope. Bootstrap creates the root directory, creates one resolved `bootstrap` ledger action for that root, records the root creation revision, writes the user root pointer, and enqueues a `seed` reaction authored by the bootstrap action. `seed` is claimed and performed through normal Reactor lifecycle, so seeded file bodies still go through perform-stage Object Storage staging and settle-time file revisions. Seed writes runtime source files and directly enqueues the first `compile` reaction. It does not install trigger rows, skill rows, or page rows. Bootstrap is not a callable skill and does not generalize to normal file operations.

Root maintenance is idempotent. `api.files.ensureUserRoot()` returns an existing root when it already exists and also synchronizes code-owned instinct rows into the `skills` table. That keeps fresh and existing users able to see callable skills before starting an action, while the skill rows still remain a projection of code-owned instinct declarations.

Normal UI code does not call `api.reactor.claimNext()`. Action start goes through `api.actions.act()`, and `act()` claims queued work immediately.

## Causality

No fake system author.

Direct human actions are authored by the user. A trigger is authored by the action that created or configured it. When that trigger later causes another action, the new action is authored by the action that caused the trigger to match.

The chain-starting human action is the `spark`. Spark identity passes through reactions so the full chain remains inspectable.

## Product Events

Product events are ledger rows, not external analytics events.

Actions, action details, file revisions, Polar events, and transactions are the event model. They carry ownership, authorship, root scope, causality, provider receipts, file changes, and costs.

There is no scattered product-event analytics stream. Performance telemetry is separate from product-event analytics and must not be treated as the audit ledger.

Domain rows are persisted by their owning Convex domain modules. Other backend modules call semantic helpers such as `addTopUpTransaction` and `recordPolarEvent` instead of writing foreign tables directly.

## Intelligence

Magic Rock is the intelligence/provider boundary. It owns `think` preparation, intelligence selection, model/provider dispatch, provider calls, receipts, usage, warnings, errors, and provider-specific result normalization.

The active intelligence list is intentionally small:

- `deepseek/deepseek-v4-flash`
- `deepseek/deepseek-v4-pro`
- `moonshot/kimi-k2.5`
- `moonshot/kimi-k2.6`
- `openai/gpt-5.5`
- `openai/gpt-5.5-pro`
- `openai/gpt-5.4-mini`

DeepSeek models run through the DeepSeek API. Kimi models run through the Moonshot API. GPT models run through the OpenAI API.

## Triggers

Triggers are durable Reactor rule projections.

The current schema direction is union typed triggers:

- code trigger: may point to a QuickJS-executable file;
- mutation trigger: reacts to file changes;
- action trigger: reacts to actions;
- schedule trigger: scheduled reaction rule.

Current playable trigger rows are compile-derived projections from `/.pro/triggers/*.ts` files. File-backed code triggers are important for user-editable behavior under `.pro/`. Schedule trigger authoring and projection are not wired yet.

Trigger rows have authors, but a trigger row is not the author of its reactions.

Mutation triggers are currently playable. A mutation trigger observes non-internal file revisions from a successful action in its scope directory or any normal descendant directory inside that scope. Child scope subtrees are compiled and triggered through their own `.pro/` marker. When a trigger matches, Reactor enqueues the trigger's configured reaction actions at the trigger root during the successful action settle mutation. Trigger rows do not perform actions directly. The reaction action execution is separate: it is enqueued, claimed by `claimNext()`, loaded for perform, performed, and settled as its own action. The reaction action is authored by the action that caused the trigger match, and it carries the original spark.

Trigger details are recorded on both sides of a match. The action that matched a trigger records the trigger id, trigger source file/path/hash, compile provenance, proposed reactions, accepted reaction actions, matched revisions, and matched paths. Each caused reaction action records the same trigger source context plus the source action and matched revisions/paths that caused it.

The runtime ignores `.pro/actions/` action-output revisions for mutation trigger matching so result files do not create accidental reaction loops. Other `.pro/` runtime source changes remain visible to mutation triggers, including the compile trigger.

## Boxes And Execute

Boxes provide compute. They do not own canonical storage.

The `execute` model:

```txt
mount scope directory subtree into /work through VFS
read current file bodies lazily through action-scoped handles
stage writes in a local overlay
scan the overlay when the action checkpoints or exits
turn changed files into proposals
Reactor validates and applies the action
```

Provider-native writable Object Storage mounts are forbidden for canonical bodies because they bypass Reactor revisions, patches, budget checks, and causality.

Daytona is the current box provider. Every compute provider uses the same Reactor apply model.

## Pages And Rendering

Pages are file conventions, not a `routes` table.

The built-in page behavior:

```txt
/example/page.tsx renders at /example
```

Task-like pages are also conventions:

```txt
/
/inbox
/tasks
/tasks/:id
/action/:id
```

Those pages are seeded as user files and loaded through VFS page resolution, not hard-coded as product domains.

Compiled page projections are queryable and inspectable by root and route. The temporary directory console uses a three-column testing work-surface layout: file explorer plus compiled state, contextual inspector, and action conversation with an action composer. The explorer column shows the directory tree and a compact `Compiled State` panel with Skills, Triggers, Pages, and compile state for the current scope. The inspector owns scope details, selected action details, text-file editing, and read-only preview/download for non-editable file bodies. Preview/download signs temporary Object Storage read URLs only after explicit user action, not when a file row merely renders. The composer owns Reactor action controls for chat, uploads, file creation, directory creation, trigger creation, selected-file move/tag, and raw action execution. The composer acts against the effective scope. Composer uploads default to the scope's `uploads/` directory, while file creation and directory creation target the visible directory. If the user is browsing inside `.pro/`, the composer still uses the owning directory as the action root. The app router does not yet render pages from the compiled projection; that remaining routing work is tracked in [Debt#5](./debts.md#debt5-file-convention-routing-and-seeding).

The `/.pro/skills` path is the canonical skill-source directory for the current root. The `/skills` app route is only a compatibility shortcut into `/.pro/skills`; it is not the canonical source location.

MDX and TSX rendering use iframe isolation. The renderer boundary is part of the security model for rendered-file data access, mutation requests, and app communication.

The seeded-page implementation is tracked in [Debt#5](./debts.md#debt5-file-convention-routing-and-seeding).

## Runtime Source, Skills, And Instincts

Skills are Reactor action definitions.

Runtime source files can define skills. The `skills` table is the derived executable projection used by `act()`, Reactor claim, scope-scoped callable skill lookup, UI lists, schema validation, and the runtime inspector. Code-owned instincts are synchronized into the same table during root maintenance and claim, so the lookup path is the same for instinct, manual, and compiled file skills.

Compile infers skill identity from the file path. A file at:

```txt
/.pro/skills/@tavily/search.ts
```

defines skill key:

```txt
@tavily/search
```

Declarations do not repeat `key`. Path is identity.

Executable skills need derived runtime rows for:

- argument schemas;
- cost behavior;
- provider requirements;
- tool exposure;
- safety checks;
- UI affordances.

File-authored configured skills use one of these kinds:

- `think`: intelligence-backed skill;
- `request`: HTTP/API skill;
- `execute`: box-backed code execution skill.

Every skill defines an `inputSchema` and an `outputSchema`.

Public skill records, including instincts, expose `inputSchema` and `outputSchema` as serialized schema strings. File-authored rows are produced by compile. Instinct rows are produced from code-owned Zod schemas.

Instincts are skills owned by code. Code is their canonical source, and `skills` rows are their runtime projection. This gives Reactor one callable skill lookup path without making instincts user-editable.

Skill rows carry a `source`:

- `instinct`: code-owned projection;
- `file`: compile-owned projection from runtime source files;
- `manual`: direct database-authored skill rows retained for the transitional skill model.

Instinct behavior lives with each instinct declaration:

```txt
convex/instincts/say.private.ts
convex/instincts/think.private.ts
convex/instincts/request.private.ts
convex/instincts/execute.private.ts
convex/instincts/create.private.ts
convex/instincts/write.private.ts
convex/instincts/move.private.ts
convex/instincts/tag.private.ts
convex/instincts/untag.private.ts
convex/instincts/interrupt.private.ts
convex/instincts/seed.private.ts
convex/instincts/createTrigger.private.ts
convex/instincts/disableTrigger.private.ts
convex/instincts/compile.private.ts
```

`lib/instinct.ts` owns `defineInstinct`, `InstinctDefinition`, `InstinctContext`, and `InstinctReactor`.

Each instinct file calls `defineInstinct()` locally. Its `perform()` function returns a Reactor `PerformResult`. Instincts do not settle actions.

`defineInstinct()` is the instinct input parser boundary. It parses the declared `inputSchema` before calling `perform()`, so instinct implementations receive typed input and do not parse `context.input` themselves. Instinct declarations do not have `load` hooks.

Skill kinds own preparation. `think` preparation lives in Magic Rock. The request kind normalizes URL, method, headers, body, and limits before perform. The execute kind builds the execution plan before perform. Write preparation freezes the current file write context before the action is scheduled.

The second `perform()` argument is the limited Reactor capability surface available during perform. Current instincts destructure `{ stageText }` from that argument when they need to stage text. `stageText` is only provided from Reactor perform-stage code, not from `act`, `claimNext`, `loadForPerform`, `settleAction`, public APIs, or UI code.

`convex/instincts/index.private.ts` is registry-only. It imports each instinct declaration, builds the registry, and exports `findInstinct()`, `listInstincts()`, and key checks.

Reactor implementation is split by lifecycle responsibility:

```txt
convex/reactor.ts
convex/reactor.private.ts
convex/reactor/claim.private.ts
convex/reactor/perform.private.ts
convex/reactor/settle.private.ts
convex/reactor/apply.private.ts
convex/reactor/stage.private.ts
schemas/reactorSchema.ts
```

`convex/reactor.ts` contains only Convex entrypoints. `convex/reactor.private.ts` is the private lifecycle facade and exports `claimNextAction`, `loadForPerform`, `perform`, and `settleAction`.

`schemas/reactorSchema.ts` owns Reactor contracts: perform args, perform results, staged text, file mutation proposals, trigger mutation proposals, provider receipts, claimed skill types, and claimed action types.

`convex/reactor/claim.private.ts` owns claim internals: callable skill resolution, input validation, skill-kind preparation, claimability decisions, preparation detail persistence, and claim-time skipped actions.

`convex/reactor/perform.private.ts` owns executing a claimed action. It calls instincts and stored skills, uses the prepared context, validates instinct output permissively, stages Object Storage bodies through Reactor capabilities, and returns `PerformResult`. It does not apply canonical file mutations.

`convex/reactor/settle.private.ts` owns normal action resolution. It marks actions succeeded, failed, or skipped through the normal perform path, records details, schedules trigger reactions, and continues the queue.

`convex/reactor/apply.private.ts` owns canonical mutation application: action output files, file mutation proposals, trigger mutation proposals, revision-producing file helpers, and path reporting. It does not call providers and does not run skills.

`convex/reactor/stage.private.ts` owns perform-stage Object Storage staging and cleanup. `stageText` is not exported through public APIs, claim, settle, or the root Reactor facade.

The root lifecycle facade does not contain instinct behavior and does not hard-code individual instinct performers.

`think` is the instinct. Magic Rock is the provider system it calls.

The current serialized schema format does not represent Convex table-specific ids. Skill schemas expose ids as strings, and id-bearing serialized fields include the `Id` suffix, such as `fileId`, `parentId`, `actionId`, and `expectedRevisionId`. Reactor parses those strings into table-specific ids at the execution boundary. This limitation is tracked in [Debt#7](./debts.md#debt7-serialized-skill-schema-id-types).

Current instincts:

- `say`
- `think`
- `request`
- `execute`
- `create`
- `write`
- `move`
- `tag`
- `untag`
- `interrupt`
- `seed`
- `prepareUpload`
- `commitUpload`
- `createTrigger`
- `disableTrigger`
- `compile`

Seed is an instinct caused by root bootstrap. It creates initial root-level runtime source files through normal Reactor apply: `/page.tsx`, `/page.css`, `/.pro/settings.json`, `/.pro/triggers/compile-on-runtime-source-change.ts`, and starter `/.pro/skills/*.ts` files. Seed then enqueues `compile` directly as a reaction. It does not create nested page conventions yet and does not create runtime projection rows.

Compile is an instinct. It reads prepared runtime source metadata, reads current file bodies from Object Storage during perform, and returns projection proposals. Settle applies those proposals to `skills`, `triggers`, and `pages` through domain helpers.

The current compile implementation is deliberately narrow. It does not execute arbitrary user TypeScript. It accepts `.ts` runtime source files, extracts literal declaration fields needed for the first projection slice, and validates kind-specific skill config before projections reach Reactor apply. Rich TypeScript declaration evaluation requires a restricted compiler and is tracked as debt.

Instinct output validation is permissive. A bad output shape records a warning and Reactor still settles the action.

The current Reactor skill runtime supports `api.actions.act()` list-based action creation, effective-scope normalization, immediate claim after act, bootstrap-caused `seed`, claim-time preparation persisted to `action_details`, perform load from prepared context, settle, code-owned instincts projected into `skills`, file-authored configured skill projection through `compile`, scope-scoped callable skill lookup, stored `think` and `request` skills, `.mdx` action result files, provider receipts, file revisions, file details, Reactor-native large uploads, mutation-trigger source creation, mutation-trigger disabling, compile-derived mutation triggers, mutation-trigger reactions, and a temporary compiled-state panel for inspecting available skills, triggers, and pages. Box-backed `execute`, code/action/schedule trigger runtime, full recursive inherited compilation, and richer skill rendering remain in [Debt#6](./debts.md#debt6-reactor-skill-runtime).

## Payments

Payments are one-time energy top-ups. Polar is the payment provider. Polar webhook events are persisted as Polar event rows so payment state can be audited and reconciled.

There are no subscriptions. Energy accounting is modeled around files, directories, actions, and provider costs.
