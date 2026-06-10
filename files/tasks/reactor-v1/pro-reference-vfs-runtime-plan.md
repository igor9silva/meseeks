---
title: PRO reference-based VFS runtime plan
priority: high
tags: [status:active, class:plan, topic:reactor]
---

# PRO Reference-Based VFS Runtime Plan

This is the implementation contract for the next Reactor v1 cleanup pass.

Read `pro-reference-vfs-runtime-decisions.md` before changing this implementation. It records the settled discussion decisions that future AI agents must preserve.

The core correction is that shared PRO things are not copied per user. They are ordinary user-owned rows/files owned by Igor's user account, made public, and resolved by exact key at use time. Users customize a shared thing by creating their own row/file with the same key. Users fork by copying to any other key they want.

No fake `pro`, `isPro`, `system`, or organization actor is introduced. Shared PRO rows/files are authored by Igor's user through normal ledgered actions.

## Locked Requirements

- Use `key` for durable identity fields:
  - `skill.key`
  - `loop.key`
  - `route.slug`
  - `intelligence.key`
  - `action.skillKey`
  - `action.loopKey`
  - `action.intelligenceKey`
- Helper/function names may use "reference" when they resolve by key, e.g. `referenceSkill`.
- Lookup is owner-scoped by exact key:
  - instincts win first;
  - then the current user's row with the same key;
  - then the configured PRO owner user's public row with the same key;
  - then fail.
- Users may create any local keys, including namespaced-looking keys such as `@pro/iterate`.
- `@pro/*` is convention, not a security policy.
- Other users cannot publish globally in v1. `isPublic` exists, but public fallback uses the configured PRO owner only.
- Forking `@pro/iterate` to `@igor/iterate` or any other key creates a different thing.
- Editing `@pro/iterate` creates or updates the user's own row/file with the same key.
- Deleting the local same-key copy resets resolution back to the public PRO row.
- No override map table.
- No `sourceVersion`; v1 has no real versioning.
- Keep source provenance only as best-effort metadata:
  - `sourceOwner`
  - `sourceKey`
  - `sourceFile`
- All mutations of PRO shared definitions must create normal actions. No direct unledgered DB patching for shared definitions.
- Shared PRO files are normal files in Igor's file tree with `isPublic=true`.
- Public directory read visibility inherits to children.
- Any visible file can be copied.
- No `tasks` domain table.
- Tasks are files by convention.
- `/tasks` and `/tasks/:id` are DB routes because task is a convention.
- `/skills` and `/skills/:id` are app code routes because skill is now a system primitive.
- `/balance` dies. `/wallet` is the route for wallet and identity.
- Route rows point directly to `file`; do not call it `componentFile`.
- Instincts are a kind of skill, but never DB rows.
- Instincts are namespaceless, directly runnable through `act()`, and trigger-runnable.
- `plan` is not an instinct.
- `say`, `think`, `execute`, and VFS primitives are instincts.
- `execute()` supports JavaScript and Python through Daytona only.
- Soft skills call `think()` internally.
- Code skills call `execute()` internally.
- Trigger handlers remain handler files evaluated through QuickJS and return proposals.
- Trigger proposals reference skill keys, not skill ids.

## Data Model Changes

Split the giant Reactor schema into domain schema files matching the existing repo style:

- `fileSchema.ts`
- `fileTagSchema.ts`
- `fileLinkSchema.ts`
- `actionSchema.ts`
- `actionDetailSchema.tsx`
- `skillSchema.tsx`
- `loopSchema.ts`
- `triggerSchema.ts`
- `routeSchema.ts`
- `indexSchema.ts`
- `endpointSchema.ts`
- `readSchema.ts`

Remove `reactorSchema.tsx` after every schema has a domain home.

### Files

Add sharing support to files:

```ts
isPublic?: boolean
sourceOwner?: Id<"users">
sourceKey?: string
sourceFile?: Id<"files">
```

Read permission:

- owner can read/write;
- everyone can read a file if it or one of its ancestors is public;
- writes still require owner.

### Skills

Skills table stores non-instinct skills only.

Required shape:

```ts
owner: Id<"users">
key: string
name: string
description: string
kind: "soft" | "code"
file: Id<"files">
input: Array<{
  key: string
  type: "string" | "number" | "integer" | "boolean" | "bigint" | "file" | "json"
  required: boolean
  description: string
}>
isPublic?: boolean
sourceOwner?: Id<"users">
sourceKey?: string
sourceFile?: Id<"files">
createdAt: number
updatedAt: number
author: userId | actionId | triggerId
```

Rules:

- unique by `owner,key`;
- no `defaults`;
- no `overrides`;
- no `sourceVersion`;
- no inline instructions/code body;
- `file` is the instruction/code file;
- `input` is the skill's typed public argument contract and must render in `/skills`;
- code skills are JavaScript or Python based on the file/runtime config, not an HTTP primitive;
- PRO shared skills are rows owned by Igor's configured PRO owner user and `isPublic=true`.

Skill resolution:

```txt
if key is an instinct key:
  return virtual instinct
else:
  find owner=currentUser and key
  else find owner=PRO_OWNER_USER_ID and key and isPublic=true
  else not found
```

No validation prevents users from creating a row whose key collides with an instinct; instincts still win at runtime.

### Loops

Loops are DB rows.

Required shape:

```ts
owner: Id<"users">
key: string
name: string
description?: string
defaultIntelligenceKey?: string
visual: { icon: string; color: string; tint: string }
isPublic?: boolean
sourceOwner?: Id<"users">
sourceKey?: string
createdAt: number
updatedAt: number
author: userId | actionId | triggerId
```

Rules:

- unique by `owner,key`;
- no `defaults`;
- no `overrides`;
- no `sourceVersion`;
- no fake `silent` loop;
- no loop means no loop triggers;
- loop selection stores key, not row id;
- runtime resolves the loop key, then gathers triggers by the resolved loop row id.

Customizing a loop copies:

- loop row with same key;
- loop trigger rows;
- handler files used by those triggers.

### Routes

Routes are DB rows for convention/app-file surfaces that should be overridable.

Required shape:

```ts
owner: Id<"users">
slug: string
file: Id<"files">
defaultFile?: Id<"files">
isPublic?: boolean
sourceOwner?: Id<"users">
sourceKey?: string
sourceFile?: Id<"files">
author: userId | actionId | triggerId
createdAt: number
updatedAt: number
```

Rules:

- unique by `owner,slug`;
- DB route lookup is current user first, then public PRO owner route;
- code routes win before DB routes;
- `/tasks` and `/tasks/:id` are DB routes;
- `/`, `/new`, `/inbox`, `/tasks`, and `/tasks/:id` must be created or repaired for existing users because they depend on per-user `defaultFile` bindings;
- `/tasks` renders the task-filtered file list, matching the left panel inside `/tasks/:id`;
- `/inbox` renders the same list surface filtered by `inbox=true`;
- `/list` does not exist and must be deleted from old managed route rows;
- `/skills` and `/skills/:id` are code routes;
- `/wallet`, `/action/:id`, auth/API/static routes are code routes.

### Actions

Actions store user/runtime intent as keys, not row ids:

```ts
skillKey: string
loopKey?: string
intelligenceKey?: string
```

Keep:

- stable per-file `index`;
- `spark`;
- `author`;
- `depth`;
- lifecycle timestamps;
- patch for mutations;
- result/costs.

Remove generic `resolvedDefaults`.

Add typed warnings:

```ts
warnings?: Array<{
  key: string
  severity: "info" | "warning" | "error"
  message: string
  source: "claim" | "perform" | "settle"
  createdAt: number
}>
```

Warnings are persisted, but UI can collapse/render only the latest relevant warning class.

### Action Details

Restore the `action_details` table.

Name it exactly `action_details`.

Purpose:

- technical receipt for what actually ran;
- mutable during action execution;
- not the primary user-facing ledger row.

Shape:

```ts
action: Id<"actions">
skill?: Id<"skills">
skillFile?: Id<"files">
loop?: Id<"loops">
provider?: string
model?: string
instructions?: string
input?: unknown
output?: unknown
usage?: unknown
warnings?: action warning[]
createdAt: number
updatedAt: number
```

Use `skill`, not `resolvedSkill`.

Old completed actions must still render if details are absent.

### Intelligences

No intelligence table in v1.

Use one in-code `INTELLIGENCES` map inside the app Reactor boundary.

Direct and wrapper intelligences share one concept:

```ts
key: string
label: string
description?: string
target?: string
provider?: "deepseek" | "moonshot" | "openai"
model?: string
pricing
context
intelligenceLevel
deprecatedAt?: number
deactivatedAt?: number
```

Rules:

- wrapper intelligences point to exactly one concrete intelligence through `target`;
- no resolver code inside intelligence definitions;
- composer chooses between same-label options based on budget/energy;
- action stores the app `intelligenceKey`;
- action details store provider/model;
- deprecated intelligence runs with a warning;
- deactivated intelligence fails at claim before reservation.

Required supported provider-backed intelligences:

- DeepSeek v4 flash
- DeepSeek v4 pro
- Kimi K2.5
- Kimi K2.6
- GPT 5.5
- GPT 5.5 Pro
- GPT 5.4 mini

Required recommended app intelligences:

- Cheap
- Efficient
- Genius variants, with the same user-visible label when needed.

## PRO Sync And Sharing

Delete `@pro/seed`.

Move PRO shared definitions into app-local code under the PRO Web/Reactor boundary.

Add a sync flow equivalent in spirit to old `replaceProSkills`:

- run explicitly by Igor;
- uses `PRO_OWNER_USER_ID`;
- creates/updates shared files, skills, loops, triggers, and DB routes;
- marks shared rows/files `isPublic=true`;
- creates ordinary ledger actions authored by the PRO owner user;
- never uses fake owners/authors;
- never mutates shared definitions without actions.

The sync flow should be idempotent by key/slug/path.

Do not delete unspecified shared rows by default.

Current implementation target:

```txt
Convex env:
  PRO_OWNER_USER_ID=<Igor user id>

Explicit sync call:
  bunx convex run seed:_syncPro '{"owner":"<Igor user id>"}'
```

The sync call is an application operation, not a fake system bootstrap. It must run against the intended Convex environment and must not be run for every user.

## Package And Namespace Cleanup

Remove `@reactor/core` as a package.

Move its useful code into the app Reactor boundary:

```txt
apps/meseeks/convex/reactor/*
apps/meseeks/lib/reactor/*
apps/meseeks/schemas/*
```

Rename `@reactor/ui` to `@pro/ui`.

Remove `@pro/seed`.

Keep Reactor visually distinct as an internal app module, not a package namespace.

## Runtime Flow

### User Act

`act()` accepts:

```ts
fileId
skills: [{ skillKey, args }]
loopKey?
intelligence?
shouldReopen?
```

No generic `settings`. The public API says `intelligence`; the action row persists the chosen app-layer value as `action.intelligenceKey`.

### Claim

Claim:

1. loads action;
2. resolves `skillKey` by instinct/current user/public PRO owner;
3. resolves `loopKey` when present by current user/public PRO owner;
4. validates/deactivates intelligence from `action.intelligenceKey`, falling back to the resolved loop default only for old/partial rows;
5. writes/updates `action_details`;
6. estimates cost;
7. reserves file budget when needed;
8. starts or fails cleanly.

### Perform

Perform:

- instincts run trusted code;
- soft skill runs through `think()`;
- code skill runs through `execute()`;
- trigger handler proposals remain QuickJS;
- Python and JavaScript code skill execution goes through Daytona.

Daytona workspace contract:

- model/user-facing code sees `/workspace`;
- current Daytona materialization uses `/tmp/reactor-workspace`;
- source-code files uploaded for `execute` and code-backed skills rewrite `/workspace` references before upload;
- declared output paths remain `/workspace/...` and are mapped back only at sync/read time.

### Settle

Settle:

- releases reservation;
- writes actual costs;
- writes action result/warnings;
- updates action details;
- creates wallet transaction for actual cost;
- schedules valid reactions unless interrupted.

### Reactions

Reaction proposals reference skill keys.

Loop trigger evaluation:

1. action has `loopKey`;
2. resolve loop row for action owner;
3. gather trigger rows by resolved loop id;
4. run handler files;
5. accepted proposals create normal actions authored by trigger id.

## UI Requirements

- `/skills` and `/skills/:id` are code routes.
- `/skills` merges:
  - instincts;
  - effective PRO public skills;
  - user custom/override skills.
- If a user has a local same-key override, show one effective row, not two.
- Skill detail shows:
  - effective editable copy when user-owned;
  - source/original read-only panel for copied/customized public skills;
  - actual instruction/code file content.
- `plan` appears as a PRO shared skill, not an instinct.
- `think()` and `execute()` appear as instincts and are runnable.
- `/tasks` and `/tasks/:id` are DB routes.
- `/tasks` is the task-filtered file list, not a separate task domain view.
- `/inbox` is the same list surface filtered by `inbox=true`.
- `/list` is removed.
- `/wallet` replaces `/balance`.
- Composer sends `skillKey`, `loopKey`, and `intelligence`; action rows persist the selected app intelligence as `action.intelligenceKey`.
- Loop picker has no fake Silent loop. No loop means no loop triggers.
- Dev Mode uses action details when present and action row/result fallback when absent.

## Testing Requirements

Unit/backend tests:

- exact-key resolution order: instinct -> user -> PRO public;
- local same-key skill overrides public PRO skill;
- deleting local override falls back to public PRO skill;
- fork with a different key does not affect original key lookup;
- route lookup resolves user route before PRO public route;
- code routes win before DB routes;
- loop key resolves to row, then triggers are gathered by loop id;
- loop customization copies loop, triggers, and handler files;
- action stores `skillKey`, `loopKey`, `intelligenceKey`;
- action details stores `skill`, `skillFile`, `loop`, provider, model;
- deprecated intelligence attaches warnings and runs;
- deactivated intelligence fails before reservation;
- PRO sync creates actions for shared definition mutations;
- public file read inheritance works.

UI/browser tests:

- `/skills` lists instincts, PRO shared skills, and user overrides as one effective set;
- `/skills/:id` shows actual file content and source/original when relevant;
- `/tasks` and `/tasks/:id` resolve through DB routes;
- `/tasks` shows the task-filtered file list and `/tasks/:id` shows that same list in the workspace;
- `/inbox` shows the inbox-filtered file list and `/list` is not configured;
- `/wallet` works and `/balance` is gone;
- composer records selected loop/intelligence keys correctly;
- Dev Mode shows action details technical receipt.

Validation commands:

- regenerate Convex types with app-installed Convex CLI;
- regenerate TanStack routes after route changes;
- run `bun typecheck`;
- run `bun lint`;
- run `bun test`;
- run browser verification against the real local dev server.

## Implementation Order

1. Split schemas and remove the giant `reactorSchema.tsx`.
2. Add sharing/provenance fields and exact-key indexes.
3. Restore `action_details`.
4. Replace generic defaults/settings with typed `skillKey`, `loopKey`, `intelligenceKey`.
5. Implement instinct registry and key resolution.
6. Rework skill, loop, trigger, route runtime lookup around exact keys.
7. Move PRO definitions into app-local code and delete `@pro/seed`.
8. Implement PRO sync with ledgered actions.
9. Move `@reactor/core` code into the app Reactor boundary and remove the package.
10. Rename `@reactor/ui` to `@pro/ui`.
11. Rebuild `/skills`, `/tasks`, `/wallet`, and Dev Mode around the corrected model.
12. Verify with unit tests, backend tests, browser tests, and local runtime checks.
