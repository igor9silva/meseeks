# Debts

This file records known technical debts in the architecture.

A debt is not an out-of-scope feature list. A debt is a known gap that the product architecture already depends on or will need to harden before production quality is credible.

Each debt entry records:

- the missing behavior;
- why the missing behavior matters;
- the current acceptable limitation;
- what would close the debt.

Entries are sorted by current priority. Debt numbers are stable references, not priority values.

## Debt#8: Request-Kind Actions CAN AND WILL Expose Secrets

> [!WARNING]
> **Request-kind actions CAN AND WILL expose secrets until this debt is paid.**

Missing behavior: request-kind actions do not yet have a safe request execution boundary.

Why it matters: request skill headers can contain app-owned API keys. Current request paths can persist request headers into action details or receipts, so request-kind actions CAN AND WILL expose secrets until this is fixed.

Current limitation: request action input, request skill config, execution receipts, action details, result files, and logs are not split into public data, server-only secret execution data, and sanitized ledger data.

Closure:

- build one request execution path for request instincts and stored request skills;
- keep secrets only in skill config or future secret references, never action input;
- persist a narrow sanitized request receipt with no request headers and no request body;
- sanitize response headers before they reach action details, result files, or logs;
- enforce the sanitized receipt shape in schema;
- add tests proving fake API keys do not appear in actions, action details, result files, or logs.

## Debt#10: Restricted Runtime Source Compiler

Missing behavior: compile does not yet evaluate rich user-authored TypeScript runtime declarations.

Why it matters: the desired authoring model is Eve-inspired `.ts` files using helpers such as `defineSkill()` and `defineTrigger()`, including inheritance through `parent`. Executing those files directly in Node would expose secrets, filesystem access, network access, and billing surfaces.

Current limitation: compile reads `.ts` files as text and accepts only a narrow literal declaration subset. It infers identity from paths and records diagnostics for unsupported source. It does not execute arbitrary TypeScript and does not support full `parent` spread evaluation.

Closure:

- define the allowed import graph for runtime source files;
- evaluate user declarations in a restricted compiler/runtime with no broad filesystem, network, or secret access;
- inject validated `parent` manifests without exposing mutable parent objects;
- validate compiler outputs with Zod schemas before writing derived rows;
- preserve source hashes, diagnostics, and compile action provenance;
- add tests proving unsafe imports, network access, filesystem access, and secret reads fail closed.

## Debt#2: Renderer Capability Security

Missing behavior: the MDX/TSX iframe renderer security model is not strong enough for rich rendered applications.

Why it matters: renderable files are part of the product surface. The iframe boundary controls what user-authored rendered files can see, request, mutate, and communicate back to the app. Rendering needs controlled capabilities, including ledger-authorized access to user data and ledger-authorized access to third-party domains.

Current limitation: iframe isolation can render files, but rendered files do not yet have a complete capability model for audited data access, network access, or mutation requests.

Closure:

- document iframe sandbox flags;
- document postMessage protocol;
- document allowed data inputs;
- document denied capabilities;
- document how rendered files request Reactor actions;
- implement ledger-authorized capabilities for user data access;
- implement ledger-authorized capabilities for third-party domain access;
- add browser tests for blocked and allowed behavior.

## Debt#6: Reactor Skill Runtime

Missing behavior: the Reactor skill runtime exists, but the full production boundary is incomplete.

Why it matters: skills are one of the few special runtime concepts. Files can define, document, or render skill-like behavior, but execution still needs runtime schemas, cost behavior, provider requirements, tool exposure, safety checks, and action ledger integration.

Current limitation: `api.actions.act()` supports list-based enqueueing, resolves visible directories to effective scope directories, directly claims affected roots, `claimNext()` prepares and schedules work, perform load moves claimed actions to running with frozen prepared context, and settle resolves them. The runtime supports code-owned instincts projected into `skills`, file-authored configured skill projection through `compile`, scope-scoped callable skill lookup, stored `think` and `request` skills, `.mdx` action result files, file revisions, action details, Reactor-native large uploads, mutation-trigger source creation, mutation-trigger disabling, compile-derived mutation triggers, mutation-trigger reactions, and a temporary compiled-state panel for inspecting available skill, trigger, and page projections. Box-backed `execute` is not wired in the current runtime. Code trigger runtime, action trigger runtime, schedule trigger runtime, full recursive inherited compilation, richer schema rendering, and rich skill-file declarations are not complete.

Closure:

- wire `execute` to boxes and canonical Reactor file apply;
- connect code, action, and schedule trigger kinds to the Reactor reaction path;
- finish recursive compile-time inheritance for directory-selected skills;
- render `inputSchema` and `outputSchema` in a useful way;
- connect costs and energy transactions to skill execution;
- add end-to-end tests for `say`, `think`, `request`, file mutations, trigger reactions, and execute.

## Debt#5: File-Convention Routing And Seeding

Missing behavior: full page convention seeding and route resolution are incomplete.

Why it matters: pages are files, not a `routes` table and not hard-coded product domains. Task-like and action-like surfaces must emerge from seeded files, tags, directory structure, renderers, and Reactor actions.

Current limitation: root bootstrap causes a normal `seed` reaction that creates root-level `/page.tsx` and `/page.css`, creates control source under `/.pro/settings.json`, `/.pro/triggers/compile-on-runtime-source-change.ts`, and starter `/.pro/skills/*.ts` files, then queues the first `compile` reaction. That direct `.pro/` child makes the user root the fallback scope. Nested page files such as `/inbox/page.tsx`, `/tasks/page.tsx`, `/tasks/{id}/page.tsx`, and `/action/{id}/page.tsx` are not seeded yet. The app still has a temporary hard-coded directory app with a resizable explorer plus compiled-state pane, contextual inspector, chat-like action conversation, composer-owned Reactor action controls, file editing, selected action details, Reactor-native file upload, mutation-trigger source editing, derived changeset inspection, and text diffs. `/.pro/skills` is browsable through the VFS directory console and the `/skills` compatibility shortcut. Wallet and top-up still use explicit app routes while VFS route resolution is built.

Closure:

- support nested path creation or staged multi-action seeding for default page files;
- resolve page requests by finding the nearest renderable `page.tsx`;
- render page files through the MDX/TSX renderer boundary;
- make `/`, `/inbox`, `/tasks`, `/tasks/:id`, and `/action/:id` work as file conventions;
- remove hard-coded temporary root UI once equivalent page files exist.

## Debt#4: Storage Billing

Missing behavior: the product does not yet define how energy billing accounts for storage costs over time.

Why it matters: most actions can be billed at execution time, but storage is duration-based. File bodies, large artifacts, revision patches, action outputs, and provider receipts can continue creating cost long after the action that produced them finishes.

Current limitation: energy accounting can charge direct action costs, but there is no settled mechanism for periodic storage rent, prepaid storage reserves, per-file minimum balances, or deletion behavior when storage funding is exhausted.

Closure:

- define which stored objects are billable and which are product overhead;
- define the billing unit for file bodies, patches, artifacts, action outputs, and provider receipts;
- define how duration-based storage charges are computed without creating fake authors or untraceable background mutations;
- define what happens when a file, directory, or user energy balance cannot cover ongoing storage cost;
- record storage charges in the action/accounting ledger with inspectable causality.

## Debt#1: Object Storage Garbage Collection

Missing behavior: unreferenced Object Storage objects are not garbage-collected.

Why it matters: Reactor writes current file bodies and large artifacts to Object Storage. If a body upload succeeds and the following Convex mutation fails, Reactor deletes the just-uploaded body immediately. A process crash between upload and cleanup can still leave an orphan object. Large browser uploads also create staged Object Storage objects during `prepareUpload`; if the browser never calls `commitUpload`, or if the commit path leaves staged objects in place to avoid unsafe post-settle cleanup, those staged objects are orphaned until GC.

Current limitation: orphan objects do not affect canonical file state because Convex decides which storage keys are live. They do create storage waste.

Closure:

- periodically list Object Storage keys under each environment/user prefix;
- compute liveness from Convex file revisions, current file pointers, patch artifacts, action outputs, and provider receipts;
- delete unreferenced keys older than a safety threshold;
- record GC runs and failures in an operations-visible ledger.

## Debt#7: Serialized Skill Schema Id Types

Missing behavior: serialized skill schemas cannot represent Convex table-specific ids such as `Id<'files'>`, `Id<'actions'>`, or `Id<'file_revisions'>`.

Why it matters: skills expose `inputSchema` and `outputSchema` as serialized schema strings. The current `zodex` serialization path can round-trip normal Zod schemas, but it cannot serialize Convex `zid()` schemas. Without a table-aware id representation, public skill schemas can only describe these values as strings.

Current limitation: instinct input schemas use string fields for ids. Those fields use `Id` suffixes so the name still communicates id semantics, for example `fileId`, `parentId`, `actionId`, and `expectedRevisionId`. Reactor parses those strings into table-specific ids at the execution boundary before it mutates files, actions, or revisions. This keeps the skill schema path simple, but the schema UI cannot yet show which table an id belongs to.

Closure:

- define a serialized representation for table-specific ids;
- make the schema renderer display id table targets;
- make schema parsing restore table-specific id validators without relying on unsupported `zid()` serialization;
- update stored skills and instincts to use the same id representation;
- add tests proving `inputSchema` and `outputSchema` round-trip table-specific ids.

## Debt#9: PerformResult Naming

Missing behavior: the Reactor perform return type is named `PerformResult`, but the intended domain name is `Performance`.

Why it matters: instincts perform actions; Reactor settles actions. The type name should match the perform-stage artifact without sounding like a generic result wrapper.

Current limitation: `PerformResult` is still used in the Reactor and instinct contracts.

Closure:

- rename `PerformResult` to `Performance`;
- update Reactor schemas, inferred types, instinct contracts, and imports;
- keep settle terminology reserved for Reactor settlement only.

## Debt#3: User-Owned Provider Billing

Missing behavior: users cannot bring their own provider API keys and settle provider billing outside the energy ledger.

Why it matters: built-in provider keys make the product work immediately, but some users need direct provider relationships for cost control, compliance, higher limits, or self-hosting.

Current limitation: energy billing charges pass-through infrastructure costs from app-owned provider accounts after the fixed deposit cut.

Closure:

- store user-owned provider credentials without exposing raw secrets to model context, rendered files, logs, boxes, or action outputs;
- route actions through user-owned credentials when selected;
- record provider receipts without charging app energy balance for externally billed provider usage;
- make mixed billing explicit when one action uses both app-billed and externally billed resources.
