# Decisions

This file records durable decisions for the product.

Decision entries explain the reason and consequence. They do not record branch logistics, temporary migration notes, or implementation chores.

## 2026-06-13

### Root `docs/` is the technical documentation source

Decision: product docs live under repo-root `docs/`.

Reason: architecture, runtime behavior, provider integration, file conventions, and security boundaries are product-wide concerns.

Consequence: every substantial round reads the full docs tree first and reconciles it before completion.

### `.pro/` marks action scope

Decision: actions run from an effective scope directory, not on a target file and not from every normal directory. A directory becomes a scope by containing a direct `.pro/` child.

Reason: an action can mutate zero, one, or many files. The scope directory provides runtime context without pretending the action has a single subject. Making every normal directory a boundary would make cloned repos, nested content, and upload folders accidentally split budget, triggers, runtime projections, and action history.

Consequence: avoid `targetFile` in action schema and APIs. Public entrypoints can receive a visible directory, but they resolve it to the nearest ancestor directory with a direct `.pro/` marker before action creation, projection lookup, claiming, trigger matching, budget lookup, output placement, or box reuse. The schema field remains `root`; its value is the scope directory.

### Object Storage owns bodies; Convex owns hierarchy

Decision: Object Storage stores file bodies under opaque keys. Convex owns directory hierarchy and paths.

Reason: path-shaped Object Storage keys make rename/move expensive and confuse storage layout with VFS truth.

Consequence: current body keys use `{envRootPrefix}/{userId}/{revisionStorageId}`, not full VFS paths.

### Box writes are proposals

Decision: box writes are not canonical until Reactor applies them.

Reason: canonical mutation passes through revisions, patches, budget checks, and action causality.

Consequence: provider-native writable Object Storage mounts are forbidden for canonical file bodies.

### No subscriptions

Decision: payments are one-time top-ups, not subscriptions.

Reason: accounting is based on files, directories, actions, provider costs, and energy balance. Subscription state does not provide the right accounting primitive.

Model: the app takes a fixed cut when energy is deposited. For example, with a 2% cut, depositing 20 energy costs the user 20.4 in payment currency. After deposit, energy spend is pass-through: the user pays exactly the underlying cost incurred by Convex, boxes, intelligence providers, Object Storage, and other infrastructure.

Consequence: the app ships with built-in provider keys so it works without user setup. Payment integration stores top-up state and provider webhook receipts. It does not model recurring subscription entitlement. User-owned provider keys and external billing are tracked in [Debt#3](./debts.md#debt3-user-owned-provider-billing).

### Small active intelligence list

Decision: the active intelligence registry contains only DeepSeek v4 Flash, DeepSeek v4 Pro, Kimi K2.5, Kimi K2.6, GPT 5.5, GPT 5.5 Pro, and GPT 5.4 mini.

Reason: the runtime is easier to build and verify with a small model list. More models can be added later when the provider/runtime paths are ready.

Consequence: DeepSeek models use DeepSeek API credentials, Kimi models use Moonshot API credentials, and GPT models use OpenAI API credentials. Models outside the active list are absent from the registry and their API keys are not part of the required environment schema.

### Instincts are code-owned skills projected into `skills`

Decision: instincts are code-owned skills whose runtime shape is registered into the `skills` table.

Reason: instincts are first-party Reactor primitives, but Reactor, UI, validation, and inspection are simpler when every callable action definition has a skill row. The row is a projection; code remains canonical.

Consequence: instinct rows use `source: instinct`, `owner: isPro`, and serialized schemas generated from code-owned Zod schemas. They are not editable file/user definitions. Reactor resolves callable skills through the `skills` table and dispatches instinct rows to the code-owned instinct registry during perform.

### Reactor action lifecycle

Decision: action execution flows through `act -> claimNext -> perform load -> perform -> settle`.

Reason: user-facing action start, runtime claiming, external work, and canonical mutation apply are different boundaries. Provider calls and Object Storage staging cannot run inside a Convex mutation, and action creation must not smuggle in running or resolved state.

Consequence: `api.actions.act()` is the public mutation. It accepts a non-empty action list; one action is represented as a one-item list. It authenticates, authorizes root access, validates skill input, inserts actions as `enqueued`, returns action ids, and directly calls `claimNext()` for the affected roots. `claimNext()` owns runtime claim, skill-kind preparation, budget/runtime authorization, `claimedAt`, `scheduledFunctionId`, and scheduling. Preparation is persisted to `action_details` and is not a receipt. Claim-time unclaimable actions are marked `skipped` with visible warnings/details before `perform`, so invalid stale enqueued actions do not block the queue forever. The perform load mutation loads that prepared context and moves the claimed action to `running`. `perform` does external work with one load call and one settle call only. `settle` applies file mutations, writes `.mdx` result files, records revisions, records post-call receipts/details, enqueues trigger reactions, and is the only normal perform resolution path.

### Skill-backed operations start only through actions

Decision: no public domain API exposes a skill-backed operation.

Reason: `create`, `write`, `move`, `tag`, `untag`, `think`, `request`, `execute`, `interrupt`, `prepareUpload`, and `commitUpload` are Reactor skills. Exposing `files.writeText`, `files.createText`, `files.upload`, or similar wrappers creates a second action-start path and makes lifecycle ownership ambiguous.

Consequence: clients call `api.actions.act()` to start skill-backed work. File APIs expose reads, tree navigation, revision reads, and root bootstrap only. Reactor private apply helpers require an existing action id and never enqueue their own action.

### Root bootstrap causes seed instead of writing file bodies

Decision: root bootstrap creates one resolved `bootstrap` ledger action directly, then enqueues a normal `seed` reaction authored by that bootstrap action.

Reason: a user root directory must exist before `api.actions.act()` can authorize and enqueue normal actions, because every action needs a fallback scope directory. Seeded files need Object Storage bodies, and Object Storage writes belong to perform-stage actions, not bootstrap mutations.

Consequence: bootstrap creates the root directory, the bootstrap action, the root creation revision, the user root pointer, and the enqueued `seed` action in one mutation. Reactor claims `seed` normally. The `bootstrap` action key is not a callable skill and cannot be claimed by Reactor. Root maintenance also synchronizes code-owned instinct rows into `skills` for fresh and existing roots, so callable skills are visible before the user starts another action.

### Seed writes runtime source, compile writes runtime projections

Decision: seed creates initial runtime source files and directly queues the first `compile` reaction. It does not insert runtime projection rows.

Reason: filesystem runtime source is canonical. If seed installs trigger rows, skills, or pages directly, bootstrap gets a second runtime-definition path and compile no longer owns projections.

Consequence: new roots are initialized by `bootstrap -> seed -> compile`. Seed writes `/page.tsx`, `/page.css`, `/.pro/settings.json`, `/.pro/triggers/compile-on-runtime-source-change.ts`, and starter `/.pro/skills/*.ts` files. The first compile does not need trigger rows because seed enqueues it directly. After that compile succeeds, the compiled trigger rows react to future runtime-source changes and enqueue compile normally.

### Mutation triggers are the first playable trigger kind

Decision: the first implemented trigger runtime supports mutation triggers.

Reason: file revisions are already canonical, ledgered, and inspectable. Reacting to successful file mutations proves the trigger-to-reaction loop without introducing QuickJS execution, action-event matching, or scheduling mechanics at the same time.

Consequence: mutation triggers store configured reaction proposals in the trigger row. After a successful action settles, Reactor matches visible file revisions against enabled mutation triggers from the action scope and inherited ancestor scopes, then enqueues reaction actions at the trigger root. `.pro/actions/` output files are ignored to avoid loops, but other `.pro/` runtime-source mutations remain visible so compile triggers can fire. Those reactions are authored by the action that caused the trigger match, carry the original spark, and follow the same `enqueued -> claimed -> running -> settled` lifecycle as human actions. Trigger details record the matched trigger, matched revisions, proposed reactions, and accepted reaction actions so causality is inspectable from both the source action and the caused reaction action. Current mutation trigger rows are compile-derived projections from `/.pro/triggers/*.ts` source. Code, action, and schedule triggers remain durable schema variants but their runtime paths are not wired yet.

## 2026-06-14

### Serialized id fields include the `Id` suffix

Decision: fields that carry ids use the `Id` suffix when their schema cannot express a table-specific id type.

Reason: serialized skill schemas and action input receipts can only represent ids as strings today. Names like `file`, `parent`, or `action` make those values look richer or more typed than they are.

Consequence: serialized Reactor inputs and action input receipts use names such as `fileId`, `parentId`, `actionId`, `triggerId`, and `expectedRevisionId`. Typed Convex schemas still use semantic names such as `file: zid('files')` when the table type is part of the schema.

### Product events use the ledger, not analytics tracking

Decision: external product-event analytics are not part of the app architecture.

Reason: product events need action/root causality, ownership, authorship, provider receipts, file revisions, and cost relationships. Scattered analytics calls create a second lossy event stream that cannot answer the product's audit questions.

Consequence: product behavior is observed through `actions`, `action_details`, `file_revisions`, `polar_events`, and `transactions`. Performance telemetry can exist separately, but it is not product analytics and not the source of truth for user or Reactor activity.

### Domain modules own persistence for their tables

Decision: domain rows are persisted through their owning Convex domain module.

Reason: direct foreign-table writes spread invariants across unrelated modules and make domain behavior harder to audit.

Consequence: backend modules call semantic helpers such as `addTopUpTransaction` and `recordPolarEvent` instead of inserting `transactions` or `polar_events` directly from another domain.

## 2026-06-17

### Reactor owns lifecycle and result schemas, instincts own built-in behavior

Decision: Reactor owns the action lifecycle, result/proposal schemas, and canonical apply path. Instinct behavior lives in individual instinct modules under `convex/instincts/`.

Reason: adding or changing an instinct does not require editing Reactor's lifecycle engine. Reactor claims, loads, performs, settles, persists details, applies revisions, enqueues reactions, and continues the queue; it does not contain a hard-coded branch chain for `say`, `think`, `write`, or any other instinct.

Consequence: `schemas/reactorSchema.ts` owns `PerformResult`, staged text, file mutation proposal, trigger mutation proposal, provider receipt schemas, and shared claimed action/skill types. `convex/reactor.private.ts` is a small lifecycle facade. `convex/reactor/claim.private.ts`, `convex/reactor/perform.private.ts`, `convex/reactor/settle.private.ts`, `convex/reactor/apply.private.ts`, and `convex/reactor/stage.private.ts` own the corresponding lifecycle internals. `lib/instinct.ts` owns `defineInstinct`, `InstinctDefinition`, `InstinctContext`, and `InstinctReactor`. `defineInstinct()` parses instinct input before `perform`, so instinct implementations receive typed input. Instinct declarations do not have `load` hooks. The second `perform()` argument is the limited Reactor capability surface, currently including `stageText` for perform-stage text staging. `convex/instincts/index.private.ts` is registry-only. Each instinct file calls `defineInstinct()` locally and returns `PerformResult` from its performer. Instincts do not settle actions; Reactor settles actions.

### Runtime source compiles into derived rows

Decision: runtime source is authored as files and compiled into derived `skills`, `triggers`, and `pages` rows.

Reason: files are the user-owned source of truth, but action validation, trigger scheduling, page resolution, and runtime inspection need queryable executable projections. Compile-time projection keeps Reactor from recursively resolving directories while preserving filesystem authorship.

Consequence: `compile` is an instinct. It is ledgered like any other action. It reads runtime source metadata prepared at claim time, reads current file bodies from Object Storage during perform, and proposes projection mutations that settle applies through the owning domain modules. Declarations infer identity from file paths; skill files do not declare `key`. Pages are projections from `page.tsx`; there is no `routes` table.

### Compile does not execute user TypeScript

Decision: the current compiler does not evaluate user-authored `.ts` files.

Reason: unrestricted TypeScript execution during compile would be a secret, filesystem, network, and wallet boundary violation.

Consequence: the current compiler accepts a narrow literal declaration subset and records diagnostics for unsupported files. A richer compiler requires a restricted execution/evaluation boundary before it can support arbitrary TypeScript declarations.

### `.pro/` is the directory control surface

Decision: runtime/control source lives under the owning directory's `.pro/` control directory, while page entry files stay at the directory root. `.pro/` also marks its owning directory as a scope.

Reason: user/domain content and runtime support source should not compete for the same visible namespace. A component or skill that supports a directory's runtime belongs to that directory's control surface; a page entry belongs at the directory root because it defines the render entry for that directory.

Consequence: `/.pro/skills/*.ts`, `/.pro/triggers/*.ts`, `/.pro/components/*.tsx`, and `/.pro/settings.json` are runtime/control source. `/page.tsx` and `/page.css` stay outside `.pro/`. `.pro/` and its descendants are transparent for action scope: an action started from `/foo/.pro/...` runs at `/foo`, and budget lookup, trigger scope, compile scope, action output placement, box reuse, and runtime inheritance use `/foo`. A normal child directory inherits its nearest ancestor scope until it gets its own direct `.pro/` child. The `/skills` app route is a compatibility shortcut into `/.pro/skills`; it is not the canonical runtime-source path.

### Magic Rock owns intelligence providers

Decision: Magic Rock is the intelligence/provider boundary.

Reason: `think` is an instinct, but provider selection, model dispatch, provider calls, receipts, usage, warnings, errors, and provider result normalization are not the skill itself. Keeping that boundary named and separate prevents provider code from spreading across Reactor or individual action lifecycle code.

Consequence: `convex/instincts/think.private.ts` defines the `think` instinct. Magic Rock owns `think` preparation and provider execution. Stored `think` skills also use Magic Rock for preparation and provider execution.

### Large uploads are Reactor actions

Decision: large browser uploads use `prepareUpload -> upload() -> commitUpload`.

Reason: file bytes cannot go through Convex mutation arguments, but canonical file creation still needs action causality, ownership checks, revisions, Object Storage pointers, and visible receipts.

Consequence: `prepareUpload` and `commitUpload` are instincts started through `api.actions.act()`. `prepareUpload` creates a staged Object Storage ticket and records it in `action_details`; it does not create a file row. The browser `upload()` helper PUTs bytes directly to Object Storage through the signed URL and sends the signed SHA-256 checksum header. `commitUpload` verifies the prepared action, HEADs the staged object, verifies size and provider-reported checksum when available, copies the object server-side to the canonical opaque key, and returns a Reactor file creation proposal. Settle creates the file row and revision. Composer uploads default to an `uploads/` directory inside the effective scope. `uploads/` is a normal directory. No public `files.upload*` API and no `uploads` table exist.
