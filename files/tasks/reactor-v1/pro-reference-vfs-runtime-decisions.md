---
title: PRO reference VFS runtime decisions
priority: high
tags: [status:active, class:architecture, topic:reactor]
---

# PRO Reference VFS Runtime Decisions

This file records settled Reactor v1 decisions from the discussion around the PRO reference-based VFS runtime. Treat it as durable context for future AI agents. If code conflicts with this file, the code is probably stale unless a newer explicit decision exists.

## How To Use This File

- Read this before older notes in `_index.mdx`; many older notes are exploratory and were superseded by this discussion.
- Preserve these decisions when continuing implementation unless Igor explicitly changes them later.
- Do not "simplify" by bringing back fake owners, per-user copied seeds, inline skill instructions, generic `z.record(z.unknown())` runtime defaults, or task compatibility APIs.
- If an implementation shortcut conflicts with the author ledger, exact-key lookup, or file-first model, treat the shortcut as wrong by default.

## Rejected Designs

- Rejected: a fake `system`, `pro`, `isPro`, organization, or principal actor for shared product definitions. Reason: it breaks the ledger precedent. Shared PRO definitions are ordinary rows authored by Igor's real user account.
- Rejected: copying all PRO skills, loops, routes, and trigger handlers into every new user account. Reason: shared product definitions should be referenced by exact key until the user customizes them.
- Rejected: an override-map table for shared definitions. Reason: exact-key owner lookup is enough for v1.
- Rejected: `sourceVersion` in v1. Reason: there is no file versioning yet, so the field would imply guarantees the system does not have.
- Rejected: an intelligence table. Reason: supported intelligences are product/runtime code definitions in v1, with wrappers represented as intelligences that target concrete intelligences.
- Rejected: DB-route `/skills` for v1. Reason: skills are now a system primitive, so `/skills` is a code route even though skill instructions/code live in files.
- Rejected: schedule-condition triggers. Reason: triggers are lightweight registrations pointing to handler files; schedules are future wake-source registrations, not trigger conditions.
- Rejected: a `warning` skill. Reason: warnings are action/result metadata.

## Vocabulary

- The product is `PRO`, not Meseeks in user-facing surfaces.
- `Meseeks` can remain in repository/app package paths where renaming would be repo churn.
- Reactor is internal architecture, not user-facing product copy.
- Say `core`, not `kernel`.
- Say `intelligence`, not model, in user-facing app concepts.
- Technical provider details can use `model` in `action_details`.
- Use `key` for durable identity:
  - `skill.key`
  - `loop.key`
  - `intelligence.key`
  - `route.slug`
  - `action.skillKey`
  - `action.loopKey`
  - `action.intelligenceKey`
- Helper names may use `reference` when they resolve by key, for example `referenceSkill`.
- Do not abbreviate `reference` as `ref` in new product/runtime APIs.

## Ownership And Public PRO Definitions

- No fake owner/author literals:
  - no `system`
  - no `pro`
  - no `isPro`
  - no organization actor
- Shared PRO definitions are regular rows/files owned by Igor's real user account.
- Igor maintains shared PRO definitions by running an explicit app-local sync script/call, similar in spirit to the old `replaceProSkills`.
- Shared PRO definitions must be created and updated through ordinary ledgered actions. This should be impossible to bypass in normal code paths.
- Shared PRO rows/files use `isPublic=true`.
- Other users cannot make globally public skills/loops/routes in v1, even if an `isPublic` field exists.
- Public fallback uses the configured PRO owner user only.
- Direct-ID lookups for public skills and loops must use the same rule as key lookup: current user's own row or the configured PRO owner user's public row. An arbitrary `isPublic=true` row owned by another user is not globally visible in v1.
- A normal directory in Igor's file tree is enough for shared PRO files. No special root actor is needed.

### Current Implementation Notes

- The configured public PRO owner comes from Convex env var `PRO_OWNER_USER_ID`.
- Do not auto-discover or invent a PRO owner. Missing `PRO_OWNER_USER_ID` means public PRO fallback is unavailable.
- Do not mutate Convex env vars from code or assistant tooling. Ask Igor to set `PRO_OWNER_USER_ID` in the target Convex environment.
- The app-local sync entrypoint is `seed:_syncPro` with `{ owner: "<Igor user id>" }`.
- `seed:_syncPro` must run as Igor's real user id and must create ordinary files/rows plus ordinary mutation actions.
- `seed:_syncPro` must verify managed row/file content even when `managedSeedVersion` already matches. The version marker is an optimization, not the source of truth.
- In a disposable preview with no `PRO_OWNER_USER_ID`, an agent may run `seed:_syncPro` against the current preview account only after Igor explicitly approves that preview data can be trashed or copied into. Never use this shortcut for DEV or production.
- User bootstrap must not copy shared PRO skills, loops, route components, or trigger handlers per user.
- User bootstrap may create or repair user route rows for product entrypoints that need per-user `defaultFile` bindings, such as `/`, `/new`, `/inbox`, `/tasks`, and `/tasks/:id`.
- When `PRO_OWNER_USER_ID` is configured, user route repair should point those rows at the configured PRO owner's public route component files. It must not create per-user route component file copies in that case.
- When `PRO_OWNER_USER_ID` is missing in a local or disposable preview environment, route repair may create private user-owned generic route component files so product entrypoints do not fail with "route not configured". This is a development fallback, not the shared PRO definition model.
- Once `PRO_OWNER_USER_ID` exists and public PRO route components have been synced, route repair should patch user route rows back to the shared public PRO component files.
- After adding or renaming Convex functions, `convex codegen` is not enough for browser verification. Run the preview deploy path (`bun preview`) so the preview deployment actually serves the new functions.

## Keys, Overrides, And Forks

- Lookup is exact-key and owner-scoped.
- Runtime resolution order is:
  1. instincts
  2. current user's exact-key row
  3. configured PRO owner user's public exact-key row
  4. not found
- Instincts win over all user rows, even if the user creates a colliding key.
- Users can create any local keys, including namespaced-looking keys such as `@pro/iterate`. Let users shoot themselves in the foot.
- `@pro/*` is convention only, not security policy.
- To customize a public PRO thing, the user creates or updates their own row with the same key, for example user-owned `@pro/iterate`.
- Deleting the user's same-key row makes lookup fall back to the public PRO row.
- To fork, copy to another key, for example from public `@pro/iterate` to user-owned `@igor/iterate`.
- No override map table in v1.
- No automatic pull/merge/update UI in v1.
- Since v1 has no file versioning, do not store `sourceVersion`.
- Source provenance can be best-effort metadata:
  - `sourceOwner`
  - `sourceKey`
  - `sourceFile`

## Files And Routes

- Everything user-addressable is file-like unless explicitly decided otherwise.
- Tasks are files by convention, usually tagged `kind=task`.
- Tags live in `file_tags`, not inline on `files`.
- New user-created files get `inbox=true` unless explicitly opted out for internal structured creation.
- Classifying is a convention through tag mutation. Do not create a `classify` skill or instinct.
- Resolve, discard, and reopen are product UI verbs for task-like files. They must be implemented through `updateFileMetadata` tag mutations, not as hidden skills.
- Any visible file should be copyable.
- Public directory read visibility should inherit to children.
- Routes remain DB rows because they are useful for user custom routes and sharing.
- Route rows point directly to `file`; do not call the field `componentFile`.
- Code routes win before DB routes.
- User DB route wins over public PRO DB route.
- Product entrypoint DB routes must be seedable and repairable for existing users. A missing `/`, `/new`, `/inbox`, `/tasks`, or `/tasks/:id` route is a bootstrap bug, not an acceptable "route not configured" steady state.
- `/skills` and `/skills/:id` are code routes because skills are now a system primitive.
- `/tasks` and `/tasks/:id` are DB routes because task is just a file convention.
- `/tasks` renders the task-filtered file list. It is the same file-list surface shown in the left panel of `/tasks/:id`.
- `/inbox` replaces the old `/list` route. It renders the same list surface filtered to unclassified inbox files through `inbox=true`.
- `/list` does not exist. If old preview/user data has a managed `/list` route, seed repair must delete it.
- `/wallet` replaces `/balance`.
- `/wallet` should cover wallet and identity.

## Skills And Instincts

- Skills are a system primitive again.
- Instincts are skills built into Reactor. They are not DB rows.
- Instincts are namespaceless, for example `say`, `think`, `execute`, `stop`, `createFile`.
- Instincts are never overridable because they win first in lookup.
- Every skill, including instincts, PRO-owned skills, and user skills, must be runnable by the user and by triggers through the public `act()` API.
- Users can only act through `act()`.
- `plan` is a PRO-owned seeded soft skill, not an instinct.
- `say` is an instinct.
- `warning` does not exist as a skill or instinct.
- Warnings are action/result warnings.
- Soft skills point to a VFS file containing instructions and call `think()` internally.
- Code skills point to a VFS file containing code and call `execute()` internally.
- Skill rows use one `file` field. Do not add `instructionsFile` or `codeFile`.
- Skill rows declare typed input arguments in `input`. The instruction/code body still lives in `file`.
- `execute()` supports JavaScript and Python through Daytona.
- `execute()` is an instinct, but it is not a trusted no-op mutation primitive. It must route through the same sandbox perform path used by code-backed skills.
- Inline `execute({ code, language })` materializes the code into the action sandbox and runs it there. Do not short-circuit it into a generic "completed" result.
- There is no HTTP skill primitive. If a skill needs HTTP, run code.
- Skill rows should not inline instruction/code bodies.
- Skill detail UI must show the actual VFS file content.
- Skill list and detail UI must show input arguments. Inputs are part of a skill's public contract, not an implementation detail.
- `/skills/:id` may resolve either a `skills` row id or the backing skill `file` id, but it still renders the skill primitive. This avoids a common footgun when users copy the visible file id while inspecting skill source.

## Actions And Details

- Action rows store app-level intent:
  - `skillKey`
  - `loopKey`
  - `intelligenceKey`
- Action rows keep stable per-file `index`, `spark`, `author`, `depth`, lifecycle timestamps, costs, result, and mutation patch.
- Restore the table named exactly `action_details`.
- Use `details`, not `executions`.
- Action details store technical receipts:
  - `action`
  - `skill`
  - `skillFile`
  - `loop`
  - provider
  - model
  - instructions/input/output/usage
  - warnings
- In details, use field name `skill`, not `resolvedSkill`.
- The action detail row having concrete IDs is enough to infer whether the runtime used a user row or public row.
- Soft-skill prompts naturally snapshot instructions and settings inside the provider request/receipt. Do not invent a separate fake snapshot field on the action row.
- Action rendering is explicit for active v1 skill keys. Old v0 renderer files are not compatibility surface; unknown historical rows should use the generic/debug renderer instead of keeping dead action components alive.

## Loops And Triggers

- Loops are DB rows and part of Reactor runtime infrastructure.
- Specific loops such as Ask, Seek, onboarding, and deep research are PRO-owned shared definitions.
- Loop selection stores `loopKey` on the action.
- Claim/runtime resolves `loopKey` to a concrete loop row.
- Loop triggers query by concrete loop row id.
- Trigger-created loop actions stamp the loop's `defaultIntelligenceKey` into `action.intelligenceKey` when the proposal did not choose one. Runtime may still fall back to the loop default for old/partial rows, but new rows should not rely on an empty action intelligence.
- No fake Silent loop. No loop means no loop triggers.
- File triggers may still run when there is no loop.
- Skill execution can still schedule reactions when there is no loop.
- Customizing a loop copies the loop row, trigger rows, and handler files with the same key under the user.
- Trigger rows are lightweight registrations:
  - `kind=file` with `file`
  - `kind=loop` with `loop`
  - `handler` points to a VFS file
  - `uses < maxUses` means eligible
- Triggers are not DB condition rules.
- Trigger handlers run through QuickJS with capped typed context and return validated proposals.
- Accepted trigger proposals become normal actions authored by the trigger id.
- Trigger proposals reference skill keys, not skill ids.
- Do not validate trigger proposal skill keys against the skills table at proposal time. Let runtime fail honestly if the key is bad.
- Increment `uses` when at least one proposal from that trigger is accepted and scheduled. This applies to public PRO loop triggers too; unlimited triggers use the sentinel and will not naturally exhaust.
- Endpoints are transport, not trigger conditions.
- Schedules are wake-source registrations, not generic trigger conditions.

## Sandbox Execution

- The user-facing sandbox workspace root is `/workspace`.
- Daytona cannot create `/workspace` directly in the current runtime, so the adapter materializes files under `/tmp/reactor-workspace`.
- Source-code files uploaded for `execute` and code-backed skills must rewrite virtual `/workspace` references to the Daytona root before upload.
- Declared output paths stay virtual. The adapter maps them back when reading outputs, and action results should report `/workspace/...` paths.
- Do not expose raw Daytona paths to model/user-facing skill code as the primary contract.

## Intelligences

- No intelligence table in v1.
- Use an in-code app Reactor boundary definition map for all supported intelligences.
- Direct provider-backed intelligences and wrappers are one concept: intelligences.
- Wrappers point to exactly one concrete intelligence through `target`.
- No resolver code inside intelligence definitions.
- Composer chooses which concrete app intelligence key to send based on user-visible choice, budget, and energy.
- Actions store the chosen app-layer `intelligenceKey`, for example `Genius`.
- Action details store the provider/model actually used at claim/perform time.
- Deprecated intelligence runs and attaches a warning.
- Deactivated intelligence fails at claim before reservation.
- Wrappers inherit deprecation/deactivation naturally from the concrete target.
- Required provider-backed intelligences:
  - DeepSeek v4 flash through DeepSeek API
  - DeepSeek v4 pro through DeepSeek API
  - Kimi K2.5 through Moonshot API
  - Kimi K2.6 through Moonshot API
  - GPT 5.5 through OpenAI API
  - GPT 5.5 Pro through OpenAI API
  - GPT 5.4 mini through OpenAI API
- Required recommended app intelligences:
  - Cheap
  - Efficient
  - Genius variants, with the same user-visible label when needed
- Do not fake unsupported providers by routing DeepSeek/Kimi aliases to OpenAI.

## Budget And Wallet

- File budget is a spending limit, not the wallet.
- Wallet/account balance is charged only on settlement transactions.
- Reservation uses file budget.
- If automatic work cannot reserve enough budget, fail/skip it with budget metadata and no reactions.
- Pending authorization is for affordable work needing permission, not insufficient budget.
- Storage rent and reusable Daytona sandbox lifetime billing are real known gaps and must be documented until implemented.
- Sign-up should round starter balance up to `$2.00`.
- Anonymous onboarding can start with a small credit, around `$0.20`.

## Packages And Boundaries

- Reactor should not be a separate package for now.
- Create a clear Reactor boundary inside PRO Web.
- Delete `@reactor/core` as a package after moving useful code into the app boundary.
- Rename shared UI package from `@reactor/ui` to `@pro/ui`.
- Delete `@pro/seed`; PRO definitions live in app-local code and sync through explicit app-local script/call.
- Keep schema files split by domain, following the existing repo schema style. Do not reintroduce one giant Reactor schema file.

## Learn Hints

- Wrong previous assumption: copying shared PRO definitions per user. Correct model is exact-key lookup with public PRO fallback and same-key user overrides.
- Wrong previous assumption: a fake `pro`/`isPro` owner could preserve provenance. Correct model is Igor's real user account and ordinary ledgered actions.
- Wrong previous assumption: `sourceVersion` is useful. Correct model has no v1 versioning, so no `sourceVersion`.
- Wrong previous assumption: `classify` is a Reactor skill/instinct. Correct model is plain tag mutation.
- Wrong previous assumption: `/skills` should be DB-routed because everything is files. Corrected decision: skills are a primitive, so `/skills` is a code route.
- Wrong previous assumption: model aliases are a separate domain. Correct model is one intelligence abstraction, where wrappers are intelligences too.
- Wrong previous assumption: `warning` should be a skill. Correct model is action/result warnings.
- Wrong previous assumption: trigger proposals should be validated against skills before scheduling. Correct model lets runtime resolve/fail by key.
- Wrong previous assumption: a missing core DB route can be left for manual setup. Correct model repairs product entrypoint route rows during user bootstrap or route self-heal.
- Wrong previous assumption: `/list` is the inbox route. Correct route is `/inbox`; `/tasks` is the task-filtered file list and `/inbox` is the same list filtered by `inbox=true`.
- Wrong previous assumption: `managedSeedVersion` alone proves seed content is current. Correct model checks the managed component files/rows and updates stale content through ledgered actions.
- Wrong previous assumption: skill instructions are enough for `/skills`. Correct model also renders typed skill input arguments.
- Wrong previous assumption: resolve/discard/reopen should be action skill keys. Correct model uses UI verbs that submit `updateFileMetadata` with status tags.
- Wrong previous assumption: `execute` can share the generic trusted-instinct completion path. Correct model routes `execute` through sandboxed code execution.
- Wrong previous assumption: old v0 action renderers are useful compatibility. Correct model keeps v1 action rendering explicit and falls back to generic/debug rendering for unknown historical rows.
- Wrong previous assumption: passing codegen means the preview backend is serving new public functions. Correct workflow is a preview deploy before browser-testing newly added Convex entrypoints.
- Wrong previous assumption: `isPublic=true` alone makes skills/loops globally visible. Correct model restricts public fallback to the configured PRO owner.
- Wrong previous assumption: shared PRO trigger `uses` does not need to increment for user runs. Correct model increments any accepted scheduled trigger, including public PRO loop triggers.
