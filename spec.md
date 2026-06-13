# PRO v1 Specification

**Current settled architecture: PRO v1 is a file-first app with code-defined instincts, DB skills as wrappers over `think/request/execute`, mandatory canonical Object Storage, `file_revisions` as the immutable revision ledger and hot cache, transactional `/work` box working copies, action result files, typed `action_details`, compiled `triggers`, mutable read cursors, user-seeded route files, public DB skills, and deliberately deferred relationship/index/endpoint systems.**

## Principles

The constitutional rule is: **engineering must reduce complexity.**

When the abstraction is right, the system gets smaller:

- fewer special cases;
- fewer fake layers;
- fewer compatibility fields;
- fewer terms;
- fewer hidden side channels;
- more things become normal files/actions/skills.

If a design needs elaborate reconciliation, inheritance engines, secret proxy machinery, or invented visibility systems before v1 works, it is probably wrong.

Reactor is an internal PRO module, not a separate package in v1. It can appear in code, debug panels, and developer documentation. Normal user-facing product copy says PRO.

## Core Objects

PRO v1 replaces the task-first domain model with files and conventions.

There is no `tasks` table. A task is a file by convention, normally tagged:

```txt
kind=task
```

Task-like routes are file-rendered product surfaces:

```txt
/          inbox surface
/inbox     inbox surface
/tasks     task list surface
/tasks/:id one task-like file/folder surface
```

These are implementable as `page.tsx` files/components. They are not a reason to bring back a task domain.

Task-like folder/file conventions:

```txt
Task.md
Summary.md
.pro/actions/
```

Task hierarchy/subtasks are ordinary child files/folders.

Task lifecycle conventions:

```txt
status=done
status=discarded
```

`idle`, `acting`, and similar activity states are derived from Reactor/action state or lightweight file metadata when needed. They are not task status enums.

Task-like items are directories tagged:

```txt
kind=task
```

Task body:

```txt
Task.md
```

Optional generated/maintained summary:

```txt
Summary.md
```

Display title:

```txt
.pro/settings.json:title
```

For efficient lists, the current display title may be compiled/cached onto the file row. List pages must not read `.pro/settings.json` for every task row.

Task conventions should be explained in normal file bodies, not only in backend code.

The root directory body can document what local tags, settings, triggers, and task conventions mean. Task directories can do the same in `Task.md`. This gives humans and AI a natural expansion surface for the convention instead of hiding meaning in product code.

The v1 application tables are:

```txt
files
file_revisions
file_tags
skills
actions
action_details
triggers
changesets
reads
boxes
transactions
topUps
polarEvents
```

Platform/auth tables such as `users`, Better Auth component tables, user preferences, and user requests remain platform infrastructure.

Settled table naming notes:

- use `triggers`, not `trigger_index`;
- keep `action_details`;
- keep `file_revisions`;
- keep top-up/payment event tables;
- do not add a `routes` table;
- do not add a `loops` table;
- `changesets` remains the current grouped file-change table name until the open naming/unification question is resolved.

Do not implement in v1:

```txt
tasks
file_links
endpoints
indexes
schedules
views
chains
patches
file_versions
workspace_heads
heads
```

Those removed systems are documented later as next steps.

## Files

Files are the user-addressable substrate.

Required file semantics:

- File IDs are permanent.
- Paths are derived from parent/name and may change.
- Names are unique within the same parent.
- The host filesystem used by Igor's current macOS checkouts is case-insensitive, but PRO must define its own VFS behavior instead of inheriting host behavior accidentally.
- For v1, treat sibling names as exact canonical names after PRO normalization. If cross-platform case behavior becomes user-visible, add a normalized-name index and intentionally reject case-only sibling collisions.
- A file can have content.
- A file can have children.
- A file can have both content and children conceptually, but mounted storage uses `index.md` for directory-like body content.
- A directory is just a file with children.
- Tags are optional user-owned conventions stored in `file_tags`.
- `availableSkillKeys` lives on files and is capped at 16 keys.
- Deleting a file tombstones it. It does not hard-delete objects in v1.

File content metadata must include enough information for reactive rendering and authorized loading:

```txt
storageKey
size
contentType
hash
revision
cacheStatus
updatedAt
```

`isPublic=true` can only be created or changed through trusted admin seed/server paths. Normal user APIs must reject attempts to make rows public.

## Directory Config

Directory config lives inside the directory under one reserved folder:

```txt
.pro/
```

Use one reserved namespace instead of many top-level dot folders.

Common shape:

```txt
some-directory/
  .pro/
    settings.json
    triggers/
      index-on-create.json
      daily-review.json
      custom.js
    indexes/
      content.json
```

Rules:

- `.pro/*` files are user-authored directory behavior and defaults.
- `.pro/*` files are normal VFS files: editable, versioned, reviewable, and included in changesets.
- Runtime DB rows are compiled from `.pro/*`; hot paths query DB rows, not file scans.
- Money, authorization, provider secrets, and accounting truth do not live in `.pro/*`.
- Do not create top-level `.triggers`, `.skills`, `.indexes`, or `.routes` directories.

Recommended source/runtime split:

| Source | Runtime |
|---|---|
| `.pro/settings.json` | directory settings/defaults |
| `.pro/triggers/*` | compiled `triggers` rows |
| `.pro/indexes/*` | future derived index setup |

Do not put everything in one mega config file. Use `settings.json` for small scalar defaults and nested `.pro/<kind>/` folders for collections.

Initial `.pro/settings.json` should stay tiny:

```json
{
  "title": "Fix checkout redirect",
  "defaultIntelligence": "auto",
  "inherit": true
}
```

Root-directory settings are user settings. Do not add a separate user-default layer in v1.

## Storage

Object Storage is mandatory and canonical for file bytes.

Tigris is the current Object Storage provider, but user/core copy should say Object Storage.

Runtime file writes read only the canonical Object Storage env names:

```txt
OBJECT_STORAGE_BUCKET
OBJECT_STORAGE_ENDPOINT
OBJECT_STORAGE_REGION
OBJECT_STORAGE_ACCESS_KEY_ID
OBJECT_STORAGE_SECRET_ACCESS_KEY
OBJECT_STORAGE_PREFIX
```

`OBJECT_STORAGE_PREFIX` is the environment root prefix. Because the bucket is shared by dev/preview environments, this prefix is mandatory. Do not support compatibility aliases such as `PRO_OBJECT_STORAGE_*`, `TIGRIS_*`, `R2_*`, or `AWS_REGION` fallback names in PRO/Reactor runtime code.

The database controls file identity, directory hierarchy, paths, current revision pointers, metadata, tags, actions, and reversible mutation ledger rows. The database does not become the canonical source for current file bodies.

Object Storage stores only the current accepted body object for a live file revision. Object keys are opaque storage addresses, not VFS paths. Historical full file bodies are not kept as separate canonical current objects. History is reconstructed through the revision patch ledger.

Object Storage may also store large patch artifacts and later garbage-collection support blobs. Those artifacts are ledger/support blobs, not current file bodies. The current file body object remains latest-only.

Hot cache cap:

```txt
256 KiB
```

File revision fields must include:

```txt
owner
file
directory
action
changeset?
previousRevision?
storageKey?
patchStorageKey?
patch?
beforePath?
afterPath?
changeKind
patchKind
beforeHash?
afterHash?
beforeSize?
afterSize?
contentType?
createdAt
```

Rules:

- `storageKey` points to the opaque canonical current Object Storage key after apply when the file has a current body.
- `action` is the action that created the revision.
- `previousRevision` points to the prior revision for the same file when one exists.
- `changeKind` is `created | updated | deleted | renamed | metadata | tagged`.
- `patchKind` is `text | binary | full | metadata`.
- Every canonical mutation stores enough reversible patch data to undo the mutation exactly.
- Small text patches may live in `file_revisions.patch`.
- Large patches, binary patches, and full-body restore payloads live in Object Storage under ledger/artifact keys and are referenced by `patchStorageKey`.
- Create revisions store enough after-state to remove the created file on revert.
- Delete revisions store enough before-state to restore the deleted file and body on revert.
- Rename revisions store `beforePath` and `afterPath`.
- Metadata/tag revisions store the previous and next metadata/tag values as patch data.
- File rows point to the current revision.
- Folder rows are files. Action-created folders must also receive `file_revisions` rows, usually with `changeKind=created`, `patchKind=metadata`, and no canonical body unless the folder has body content. A directory mutation is incomplete if only the `files` row changes.
- Files keep current content metadata needed for reactive rendering and reads.

Object key layout for applied current file bodies:

```txt
{envRootPrefix}/{userId}/{revisionStorageId}
```

`revisionStorageId` is opaque. It must not encode the VFS path, file name, title, action directory, or route. The database owns hierarchy and user-visible paths.

Patch/artifact keys must not pretend to be user-visible file paths. Use an internal Object Storage prefix for support blobs, for example:

```txt
{envRootPrefix}/{userId}/.pro-internal/patches/{actionId}/{fileRevisionId}
```

Write flow:

```txt
compute reversible patch from previous state to next state
write current body to Object Storage when the file has content
if the following mutation fails, delete the just-uploaded body immediately
write large patch artifacts to Object Storage when needed
create file_revisions row with patch metadata and optional hot patch
update file current revision/content metadata
record action result/details/changes as needed
```

If Object Storage is missing or misconfigured, write actions fail loudly with the exact missing provider/env/config. Do not silently fall back to Convex-only bodies.

Implementation boundary:

- box/provider modules own provider lifecycle, status, logs, and provider ids;
- Reactor file-transaction apply owns canonical file mutations, revisions, patches, changesets, and cleanup decisions;
- `execute()` turns staged VFS overlay changes into proposals, then calls the file-transaction apply path;
- box lifecycle code must not create file revisions or changesets directly.

## Object Storage Garbage Collection

Object Storage GC is deferred from v1 implementation but required later.

Simple rule:

```txt
DB current storage keys are live.
Unreferenced Object Storage keys older than a safety threshold are garbage.
```

GC should periodically:

```txt
1. list current file revision storageKey values for a user/environment
2. list support artifact keys still referenced by revision/action detail rows
3. list Object Storage keys under {envRootPrefix}/{userId}/
4. delete unreferenced current-body-shaped keys older than the threshold
5. delete unreferenced internal artifact keys according to their retention rules
6. report counts and suspicious misses in action/admin details
```

Do not run GC by trusting Object Storage hierarchy. The database decides liveness.

Read flow:

```txt
File API loads the file and current revision
if cached text is available and revision matches, return it
otherwise use an authorized server loader for the current Object-Storage-backed body
```

The browser UI must not receive broad Object Storage credentials. Cache-miss content is loaded through an authorized File API loader keyed by file/revision.

Internal read helpers should use names like:

```txt
readContent
readPreview
hydrateContent
```

Do not expose `cat`, `head`, `tail`, or `patch` as instincts in v1.

`write` is a Reactor instinct because users, skills, and triggers need an atomic file mutation primitive.

## Mounted PRO VFS

Boxes mount one writable action-directory working copy:

```txt
/work
```

`/work` is a PRO VFS mount, not a provider-native writable Object Storage mount.

The mount exposes the action directory as a normal filesystem path while preserving PRO's authority boundaries:

```txt
Convex
  owns file identity, directory hierarchy, paths, metadata, current revision pointers, budgets, actions, changesets, triggers, and patches

Object Storage
  owns current file bodies and large support artifacts
  uses opaque keys
  does not own user-visible hierarchy

PRO VFS mount
  exposes DB-owned hierarchy inside the box
  lazily reads current bodies from Object Storage
  stages writes locally
  reports a transaction proposal to Reactor

Reactor apply
  validates paths, revisions, caps, budget, and conflicts
  writes accepted current bodies to Object Storage
  writes reversible patch/revision/change/action ledger rows
```

No `/pro/source`.
No `/out`.
No canonical writable Object Storage mount.

Provider-native S3/Tigris mounts are allowed only as internal implementation details or caches when they preserve the same contract. They must not become the canonical mutation path.

Object Storage uses one shared bucket across environments. Each deployment environment gets an environment root prefix. Inside that prefix, each user gets a user prefix:

```txt
{envRootPrefix}/{userId}/...
```

The user's root directory is the root `files` row for that user. The `users` table stores an explicit pointer to it, created on first sign in:

```txt
users.rootFile
```

The Object Storage object path after `{envRootPrefix}/{userId}/` is opaque and does not mirror the VFS path. The action directory subtree appears inside boxes at:

```txt
/work
```

A directory body, when materialized as a normal mounted filesystem, lives at:

```txt
/work/index.md
```

Directory-like files use `index.md` for their body content because a normal mounted filesystem cannot safely represent a single path as both file and directory.

Move/rename is a database hierarchy mutation. It must not rewrite Object Storage keys unless file content changes.

`/work` is not canonical storage. Box writes become canonical only after Reactor scans the mounted working copy and applies the transaction.

Mount implementation rules:

- The box must not receive broad Object Storage credentials.
- The mount receives an action-scoped manifest with paths, file ids, revision ids, hashes, sizes, content types, and scoped read handles for current bodies.
- Read handles may be presigned Object Storage URLs or another scoped server-readable token. They must expire.
- File bodies are read lazily. Starting an action must not upload or copy the whole directory tree.
- Writes, creates, deletes, and renames are staged in box-local overlay state.
- The overlay state, not the canonical Object Storage bucket, is scanned for changed files.
- If a provider cannot run the PRO VFS mount, that provider is not suitable for large `execute()` in v1. File-by-file upload may exist only as a development fallback and must be reported as degraded behavior.
- Direct writable Tigris/S3 mounts are not allowed for canonical file bodies because they bypass Reactor patches, revisions, changesets, budget checks, and action causality.
- Read-only provider mounts may be used for global datasets or cache/projection acceleration, but PRO VFS remains the contract.

## Tags

Tags are string key/value pairs stored in `file_tags`.

Rules:

- One tag key can appear once per file.
- Updating a tag replaces the value.
- Removing a tag deletes the row.
- Tags are not schemas.
- Tags are not security rules.
- Tags are not budget/accounting state.
- Tags are conventions for organization, filtering, routing, and UI.

Canonical v1 conventions include:

```txt
inbox=true
kind=task
kind=memory
kind=skill
status=active
status=done
status=discarded
priority=high
topic=reactor
source=ticktick
```

Inbox is only:

```txt
inbox=true
```

Do not use missing-kind queries for inbox.
Do not use `kind=inbox`.

Missing `kind` may be used as a trigger condition during raw capture/classification, but it is not the canonical inbox query and not the primary task creation path. The efficient product state is positive:

```txt
if a capture has no kind, a trigger/instinct may set inbox=true
```

That keeps inbox fast and avoids negative tag scans.

Intentional task creation should use `createTask()`, not a post-create trigger that tries to repair a generic file/directory into a task.

## Actions

Actions are the immutable ledger of work.

Every action runs in exactly one directory.

Actions do not have `targetFile`. Files read, written, or mutated by the action appear in args, action details, result files, and changesets.

Core action fields:

```txt
owner
directory
index
depth
spark
author
cause?
skillKey
loopKey?
intelligenceKey?
args
status
result
expectedCost
maxCost
reservedBudget
costs
createdAt
claimedAt
startedAt
settledAt
interruptedAt
```

`index` is stable per directory. It is also used in user-visible VFS action result paths:

```txt
.pro/actions/000123/...
```

When materialized inside a box, that path appears under `/work`.

`result` points to the primary result file. It is not inline text.

Author model:

```txt
author = userId | actionId
```

Triggers are causes, not authors. A trigger-fired action is authored by the action that authored the trigger.

`cause` records the runtime mechanism when useful, for example:

```txt
cause = triggerId | actionId | requestId | boxTransactionId
```

No `system`.
No `built-in` author.
No organization author in v1.

`spark` is the action that started the current chain. It is naturally human-authored and passes through reactions.

Direct human action:

```txt
author = userId
spark = self action id
depth = 0
```

Reaction from an action:

```txt
author = previous action id
spark = previous.spark
depth = previous.depth + 1
cause = previous action id when the immediate cause needs to be rendered
```

Trigger-fired action:

```txt
author = trigger.author
spark = trigger.author.spark
depth = trigger.author.depth + 1
cause = trigger id
```

The source event that made the trigger eligible is stored in action details. Do not collapse event source, trigger cause, and author into one field.

Schedule-trigger spark behavior is deferred with schedule triggers.

Actions store user-visible `intelligenceKey`. The computed provider/model lives in action details at claim time.

## Action Details

`action_details` stores internal/provider/structured side records.

It is a typed variant table, not a loose metadata dump.

Use action details for:

- `think` provider/model records;
- encrypted reasoning/provider continuation state;
- `request` sanitized HTTP records;
- `execute` process/box records;
- changed-file metadata;
- structured runtime warnings;
- box runtime/lifecycle records;
- box transaction records.

User-visible output goes in result files.

Provider/internal records do not belong in action rows as `providerMetadata`.

Warnings are stored structurally in action details and rendered visibly in result files using:

```mdx
<Warning>
...
</Warning>
```

## Result Files

Every action gets normal result files.

The action row stores `result`, pointing to the primary result file.

All action result files are `.mdx` files in v1.

Per-kind conventions:

```txt
think:
  .pro/actions/000123/result.mdx

request:
  .pro/actions/000124/result.mdx

execute:
  .pro/actions/000125/result.mdx
  .pro/actions/000125/stdout.mdx
  .pro/actions/000125/stderr.mdx
```

Action result files are regular files. Do not hide them at the storage/model level. UI may group them later, but v1 should treat them as ordinary files.

Small result files may be hot-cached in `file_revisions.content`.
Large result files stay in Object Storage and are loaded through the File API.

`think` happens through an action. The action persists its user-visible output to `result.mdx`; `action.result` points to that file. No inline action result is canonical.

`think` reasoning may stream into `result.mdx` while the action is running using:

```mdx
<Reasoning>
...
</Reasoning>
```

Encrypted provider continuation state lives in action details, not the result file.

## Changed Files

After `execute`, Reactor records changed-file metadata in action details and grouped changesets.

No patches in v1.
No partial diffs.
No "small files get patches" exception.

Persist only paths grouped by operation:

```txt
created
updated
deleted
```

Changed-file scan cap:

```txt
500 paths
```

If the cap is exceeded, details must mark the changed-file metadata as truncated.

Changed-file metadata is observation, not approval. Box writes are proposals until Reactor applies a transaction.

Git-like patches may be generated for display later, but they are not canonical. Native PRO revisions and applied changes are canonical.

## Transactional Box Writes

Box writes must not mutate canonical VFS state directly.

The invariant:

```txt
box scan = proposal
Reactor apply = mutation
```

Short `execute()` flow:

```txt
1. materialize action.directory descendants into /work
2. record base manifest
3. run command
4. scan changed tree on command exit
5. compute proposed patches from base manifest to scanned output
6. try clean text merges when current revisions moved
7. upload final accepted bodies to Object Storage
8. validate and apply transaction
9. record details/result files
```

Base manifest entries:

```txt
path
fileId
revisionId
hash
size
contentType
```

Changed paths are grouped as:

```txt
created
updated
deleted
renamed?
```

Renames are optional in v1. It is acceptable to record rename-like changes as delete plus create.

Changed file bodies stay inside the box until Reactor scans the tree and prepares a transaction. The box never writes canonical VFS state.

Reactor uploads final accepted bodies before the apply mutation so DB-current revisions never point to missing objects. If the apply mutation fails, Reactor deletes the just-uploaded bodies immediately. A crash between upload and cleanup can leave an orphan object; later Object Storage GC owns that cleanup.

Apply phase:

```txt
check expected current revisions still match
if the original base moved, apply a clean text three-way merge when possible
compute full reversible patches for every mutation
write current bodies to canonical opaque Object Storage keys
write large patch artifacts to internal Object Storage keys when needed
create new file revisions
create/update/tombstone files
record changed-file details
mark transaction applied
advance action/session base manifest
```

If current revisions changed since materialization:

```txt
try a text three-way merge using base, current, and proposed content
if merge is clean, apply merged content as the new revision
if merge conflicts, do not apply that file and show details
```

If paths are forbidden, caps are exceeded, budget is missing, or validation fails:

```txt
mark transaction rejected/failed
do not apply
delete just-uploaded objects immediately when possible
leave rare crash orphans for later Object Storage GC
```

For v1, clean transactions may auto-apply immediately. Manual review can be added later without changing the primitive.

Store v1 transaction records as typed action details unless a separate table becomes clearly necessary.

Suggested action detail shape:

```txt
kind = boxTransaction
action
directory
baseManifestPointer
changedManifestPointer
status = staged | applied | rejected | conflicted
created[]
updated[]
deleted[]
renamed[]
uploadedObjects[]
revisionPatches[]
warnings[]
```

Box transaction bodies use final opaque Object Storage keys and are deleted immediately if the apply mutation fails. Applied current file bodies use the canonical opaque Object Storage key:

```txt
{envRootPrefix}/{userId}/{revisionStorageId}
```

Efficient scan rules:

- compare file list first;
- compare size/mtime-ish metadata when available;
- hash only candidates;
- cap changed paths;
- ignore `.git`, dependency folders, caches, temp folders, and provider runtime files by default;
- treat `.pro/actions/` as Reactor-owned output, not box-authored sync input;
- validate `.pro/settings.json` and `.pro/triggers/*` changes before applying;
- linked/projection files are read-only and never write through to global targets.

Provider snapshots/forks/copy-on-write boxes may optimize isolation and cleanup, but PRO owns manifest diff, validation, and apply. Do not rely on provider volumes as canonical transaction boundaries.

Long-running boxes use checkpoints, not provider stop/lifecycle calls, as the persistence boundary.

Concepts:

```txt
box session
  long-lived working copy for a directory

box process
  command/agent/dev server running in the box

box transaction
  staged filesystem diff produced by a process exit or checkpoint
```

Long-running flow:

```txt
start session/process
keep dirty working tree in box
checkpoint after each action turn or explicit checkpoint
stage/apply one transaction per checkpoint
advance base manifest after apply
stop later for lifecycle only
```

`interrupt` and provider stop/lifecycle calls are not commit primitives.

Allowed box lifecycle calls:

```txt
checkpointBox()
stop({ checkpoint: true })
stop({ discard: true })
stop({ keepDirty: true })
```

For Codex-like long-running agents, each user/agent turn should produce its own checkpoint transaction so causality, budget, trigger firing, and review stay attached to the turn that caused the change.

## Skills

Instincts are code-defined skills. They do not live in the DB.

DB skills are user/PRO-defined wrappers over one execution kind:

```ts
kind = "think" | "request" | "execute"
```

No `hard`.
No `soft`.
No `base`.
No skill inheritance in v1.

Instinct lookup wins before DB lookup.

Lookup order:

```txt
1. namespaceless instincts
2. user-owned DB skills
3. public PRO DB skills
```

User skill with the same key as a public PRO skill overrides the public skill for that user. User skills cannot override instinct keys.

`/skills` shows:

- read-only runnable instincts;
- user DB skills;
- public PRO DB skills.

V1 skill availability lives directly on the directory/file row:

```txt
files.availableSkillKeys = string[]
```

`availableSkillKeys` is capped at 16 keys.

Do not implement `.pro/skills` bindings in v1. The binding/link model is not settled and may be weaker than pointing at registered skills by key/id.

Skills are still a Reactor primitive, not just arbitrary files. The file can be the source of truth for user-authored definition, but execution needs a trusted runtime/index for schema validation, authorization, provider requirements, cost rules, and tool exposure.

## V1 Instincts

V1 instincts:

```txt
say
think
request
execute
create
write
move
copy
delete
tag
untag
updateBudget
render
interrupt
```

Use names without the `File` suffix for core file operations.

V1 composite skills:

```txt
createTask
```

Composite skills are code-defined wrappers over primitive operations. They exist for intentional object construction and coherent UX, not as separate product domains.

`createTask()` creates the canonical task directory shape directly:

```ts
createTask({
	directory,
	title,
	body,
	summary?,
	budget?,
	availableSkillKeys?,
	tags?,
	inbox?
})
```

It folds into primitive mutations:

```txt
create task directory
write Task.md
write optional Summary.md
write/update .pro/settings.json:title
set kind=task
set inbox=true only when requested or unclassified
set budget fields when budget is provided and authorized
set availableSkillKeys when provided
apply extra tags
```

For v1, prefer one parent action with structured details listing the primitive expansion. Do not create noisy child actions for every internal primitive unless a later review/authorization flow requires it.

Use composite skills for intentional creation. Use triggers for reactions and safety nets.

All user and trigger execution goes through:

```txt
act({ directory, skillKey, args, loopKey?, intelligenceKey? })
```

Do not expose separate public mutation APIs like `createFile()` for normal user execution. UI helpers may wrap `act()`, but public backend execution is through `act()`.

## Think

`think()` is a trusted Reactor-side intelligence instinct.

It runs in the Convex/Reactor layer, not in a box.

It owns:

- provider calls;
- streaming;
- reasoning continuity;
- encrypted reasoning items;
- tool-call handling;
- intelligence billing.

It can use skills as tools through Reactor.

It cannot mutate VFS directly. Mutations happen by scheduling normal actions.

Flow:

```txt
think runs
provider/tool output is parsed
Reactor inserts proposed actions authored by the think action
claim-time handles authorization, preapproval, budget, and execution
```

The model sees skills as tools, but tool execution is still Reactor execution. A tool call is not a direct mutation.

`think` skill config:

```ts
{
	intelligence: "auto" | IntelligenceKey;
	temperature?: number;
	maxTokens?: number;
	tools: {
		skillKeys: string[];
		includeFileSkills: boolean;
	};
}
```

`includeFileSkills` means append the current file's `availableSkillKeys`, capped at 16.

This replaces the old placeholder workaround:

```txt
{{taskSkills}}
```

The placeholder approach is technical debt and must not be carried forward into v1.

## Request

`request()` is a trusted Reactor-side HTTP instinct.

It runs in the Convex/Reactor layer, not in a box.

It is how PRO HTTP/API skills work:

```txt
@tavily/search
@firecrawl/scrape
@exa/search
@valyu/search
@youtube/transcribe
...
```

This keeps secrets out of boxes entirely.

Request skills preserve the main app's ergonomic shape:

- URL;
- method;
- headers;
- search/header/path/body/bodyPath param mappings;
- optional body template.

Header values are typed:

```ts
type RequestHeaderValue =
	| { kind: "literal"; value: string }
	| { kind: "env"; name: string; prefix?: string; suffix?: string };
```

Raw secrets must not be stored in DB rows. Env references are resolved only inside trusted Reactor/Convex execution.

Secrets must not enter:

- boxes;
- `execute.env`;
- action result files;
- details exposed to users;
- logs;
- mounted files;
- provider-visible debug output.

Dynamic request cost:

```ts
const requestCostSchema = z.union([
	z.object({
		kind: z.literal("static"),
		amount: moneySchema,
	}),
	z.object({
		kind: z.literal("dynamic"),
		path: z.string().min(1),
		amountPerUnit: moneySchema,
	}),
]);
```

Actual dynamic cost:

```txt
ceil(decimal(response[path]) * amountPerUnit)
```

Always round up to internal money precision.

Claim-time reserves max configured cost.
Settlement charges actual provider-reported cost when available.

If a PRO skill's configured cost path is missing/invalid, fail loudly rather than silently undercharge.

## Execute

`execute()` is a box-backed bash instinct.

It runs in Daytona.

Direct instinct input:

```ts
{
	command: string;
	timeoutMs?: number;
	env?: Record<string, string>;
}
```

`execute.env` is plain non-secret env only.

Raw secrets should never enter boxes.

`execute()` is for local computation/processes, not trusted HTTP with secrets.

The base box image comes with development tools and Bun/python out of the box. JavaScript and Python run by invoking Bun/Python from bash.

Execute-kind DB skills are fixed command presets. Their config owns the bash command.

Dynamic argument execute skills are not in v1. If the user/model needs a dynamic command, it calls `execute(command)` directly.

`execute()` cannot invoke actions by itself in v1. Only normal trigger-based reactions schedule follow-up actions.

It produces process output and filesystem changes. If execute-produced reaction proposals are needed later, add a separate explicit protocol.

Filesystem changes are staged as box transactions and only become VFS state after Reactor validates and applies them.

## Boxes

Boxes are reusable per action directory.

Use `box` in core/user naming. Use `sandbox` only at the Daytona adapter boundary.

`execute()` creates or resumes the directory's box/session.

Initial lifecycle rules:

```txt
auto-stop after about 1 minute idle
auto-archive after about 1 hour stopped if Daytona supports it cleanly
auto-delete after about 30 days stopped/archived
```

Definitions:

```txt
running/stopped:
  compute state

archived:
  provider preserved disk state in cheaper storage if available

deleted:
  resumable box disk is gone
```

Provider snapshots/forks may be used when available, but are optimizations. PRO transaction semantics come from manifest diff plus Reactor apply.

If mounting Tigris/S3 directly, credentials must not expose the whole bucket to untrusted box code. The acceptable boundary is provider-managed scoped mounting or prefix-scoped credentials. Broad bucket credentials inside the box are not acceptable.

## Box Billing

Box runtime billing is detached from action result settlement but still causally tied to the ledger.

The box belongs to an action directory. Runtime cost charges the resolved file/directory budget and then the wallet through settlement transactions.

On `execute()` start:

```txt
ensure box exists
if there is not enough reserved runtime runway, reserve more from file budget
run the command
```

Reserve target:

```txt
reserveTarget = min(15% of file.availableBudget, estimated cost of 1 minute default box)
```

If the reserve is tiny, still try. Daytona runtime is cheap and final settlement can honestly overrun.

On provider stop webhook:

```txt
compute actual runtime cost
release unused reservation
charge wallet transaction for actual runtime cost
if actual cost exceeds file budget, settle honestly and mark the file needing attention
```

The causal author for box settlement is the action that originally created the box. The webhook is transport/lifecycle signal, not the root author.

For v1, stopped/archived box storage is free to the user. Track provider lifecycle metadata internally, but charge $0 for now.

Include a simple repair job for missed lifecycle settlement. Document it as technical debt. Jobs are not the desired long-term design, but leaving box runtime billing hanging is worse.

## Billing

Action costs stay on actions where the cost is directly caused by that action:

- `think` intelligence cost;
- `request` HTTP/provider cost.

Box runtime billing is attached to boxes/file budget, not fake per-action provider costs.

Object storage rent is tracked with size/metadata but charged $0 in v1.

Wallet is charged only through settlement transactions.

File budget is a spending limit, not the wallet.

Task budget becomes file/folder budget.

Do not add a budget table in v1.

Budget state is authoritative typed state on `files`, not loose metadata and not `.pro/*` config.

Minimum file budget fields:

```txt
budgetTotal?
budgetAvailable?
budgetReserved?
storageReserve?
```

Actions resolve budget by walking ancestors from the action directory:

```txt
start at action.directory
if directory has budget fields, use it
else check parent
else check parent
...
else root/wallet fallback or fail
```

This is `O(depth)`, not a descendant scan. Cap ancestor depth.

Actions must pin the resolved budget file at claim time:

```txt
actions.budgetFile
actions.reservedBudget
```

Settlement charges/releases against the same budget file even if inheritance changes later.

Keep these concepts separate:

```txt
wallet balance
  user funds

file budget/reserve
  authorization pool for actions scoped to a file/folder

action cost
  settled provider/runtime cost caused by one action

storage reserve
  prepaid rent for bytes over time
```

The old active-task wallet tab does not survive as UX. The accounting concept survives on files.

Transactions remain the movement ledger:

```txt
transactions
  owner
  file?
  action?
  kind
  amount
  description
```

Editing `.pro/*` may request or describe desired behavior, but it must not directly mutate money. Trusted server code changes file budget fields and writes transactions.

## Reads

`reads` is not append-only.

It is mutable per-user UI state:

```txt
user X has read file Y through action index N
```

Unread is derived:

```txt
latest action index > lastReadActionIndex
```

Reads should not be ledger actions. Read cursors changing should not make files unread or create action noise.

Use a safe sentinel or absence of row for "nothing read yet"; do not let an empty file marked read hide the first future action.

## Loops

There is no `loops` table in v1.

Loops are inherited definitions through the filesystem.

No loop table and no file links/symlinks in v1.

If loop selection is needed before the link model is settled, use explicit directory settings or direct trigger files. Do not introduce a weak link primitive just to make loop switching feel clever.

`actions.loopKey` may remain as a pinned action field for debugging/causality when a selected loop resolves to a named loop.

## Triggers

Trigger runtime state lives in the `triggers` table.

Trigger definitions may be file-backed or DB-authored depending on trigger kind.

File-backed trigger handlers live in:

```txt
.pro/triggers/*
```

Those files are source for code/file-authored triggers. The `triggers` table is compiled/runtime state.

Some trigger rows may be created directly by trusted UI/actions without a source file. Schedule triggers are the main case where a file is optional, but schedule execution is deferred for v1 until the scheduler design is settled.

Do not use triggers as the main constructor for task shape/defaults. `createTask()` owns intentional task construction. Triggers handle reactions after events and safety nets for raw captures.

Runtime trigger rows must have:

```txt
owner
directory
sourceFile?
author
trigger
enabled
status
hash?
lastRunAt?
nextRunAt?
lastError?
```

Trigger `author` is explicit. In normal user flows it is the action that created or last enabled/updated the trigger:

```txt
author = actionId
```

Seed/admin-only paths that cannot point to a user action must still use an explicit real principal, never `system`.

No `system`.

Trigger definition is a discriminated union. Initial variants:

```ts
type Trigger =
	| {
			kind: "mutation";
			event: "file.created" | "file.updated" | "file.deleted" | "file.renamed";
			matcher?: { glob?: string; tags?: Record<string, string> };
			action: { skillKey: string; args: Record<string, unknown> };
	  }
	| {
			kind: "schedule";
			schedule: { cron?: string; at?: number; timeZone?: string };
			action: { skillKey: string; args: Record<string, unknown> };
	  }
	| {
			kind: "action";
			event: "action.started" | "action.settled" | "action.failed";
			matcher?: { skillKey?: string };
			action: { skillKey: string; args: Record<string, unknown> };
	  }
	| {
			kind: "code";
			handlerFile: string;
			events: string[];
	  };
```

Code triggers point to handler files and are evaluated through QuickJS with capped typed context.

Handler result:

```txt
validated action proposals
```

Accepted proposals become normal actions authored by `trigger.author`, with `cause` pointing at the trigger id.

On trigger file create/update/delete:

```txt
parse source file
validate union type
upsert/disable compiled trigger row
store compile status/error
```

Runtime action/mutation execution should query `triggers` rows. File-backed trigger files are the source for compilation/rebuild, not something to rescan blindly on every action.

Schedule triggers use runtime `nextRunAt`/scheduled function ids for efficient wakeups when schedule execution is implemented. The scheduled function is transport. The trigger is the cause.

Mutation triggers run from changed files and their ancestor directories, not only from the action directory.

Action triggers run from the action directory and its ancestor directories.

Root-directory triggers are how broad behavior is expressed. Do not add a separate "global trigger" concept.

Trigger eligibility uses uses/maxUses.

Endpoints are future transport. They may feed trigger evaluation, but they are not themselves trigger kinds in v1.

## Routes

There is no `routes` table in v1.

Routes are filesystem conventions. A route is resolved from page files in the user's VFS, with an optional derived route index later for speed.

Code-owned primitive routes:

```txt
/skills
/skills/:id
/skills/instinct/:key
/wallet
/top-up
/top-up/:id
```

File-routed product surfaces are seeded user files:

```txt
/
/inbox
/tasks
/tasks/:id
/action/:id
custom user routes
```

Those surfaces are conventions, not code-owned product domains and not DB route rows.

Route files point directly to component files. User-owned route files win over seeded/default route files when both are applicable.

Slugged components are files, not component rows.

Example:

```txt
/example/page.tsx
```

maps to:

```txt
/example
```

This replaces the old component row with `slug=/example`.

V1 may implement route loading through one wildcard `$` route that resolves VFS page files.

## Rendering And File Includes

User info and memory emerge from files.

Instruction/rendering needs a native file include primitive, likely:

```mdx
<File id="..." />
<File path="./Task.md" />
<File path="/memory/profile.md" maxChars={8000} />
```

Rules:

- server resolves the file;
- server checks authorization;
- only text files are allowed at first;
- only hot-cache-size content may be included;
- oversized or binary files fail at render time with a clear error;
- the included revision should be recordable for reproducibility.
- path includes resolve relative to the current render directory unless absolute.

This matters for skills, instructions, and memory-like context.

TSX rendering needs its own security design. For now, render TSX route files in the simplest possible implementation and keep the security design as a known follow-up; do not claim the TSX execution boundary is solved.

## PRO Seed And Public Rows

Most PRO definitions are seeded into each user's root filesystem on bootstrap.

On first sign in:

```txt
create users.rootFile
seed default route files
seed default task/inbox/action page files
seed default loop/trigger files as normal user-owned files when needed
```

Normal users own and may edit their seeded files.

Only `skills` use public rows in v1.

Public skills use:

```txt
skills.isPublic = true
```

Normal users can read public skills. Only trusted admin seed/server paths can create or update public skills.

User-owned skills with the same key override public skills after instincts.

## Intelligences

Use a full code-defined intelligence registry.

It includes:

- concrete provider models;
- user-facing aliases/wrappers;
- `deprecatedAt`;
- `deactivatedAt`.

Action rows store user-visible `intelligenceKey`.

Details store the claim-time provider/model actually used.

Preferred intelligence needs explicit resolution rules before it becomes more than a composer default.

Default direction:

```txt
1. action argument
2. current directory settings
3. ancestor directory settings
4. root directory settings
5. app default
```

The resolved value is pinned on the action at claim/start time. Budget-aware fallback may happen before claim, but a running action must not float to a different model because a parent preference or budget changed.

Deprecated intelligence:

```txt
run, but emit a warning
```

Deactivated intelligence:

```txt
fail immediately
```

Composer may choose among similarly named user-facing options such as Genius variants, but wrappers always resolve to one concrete intelligence at claim time.

## UI

Adapt the existing PRO app UI. Do not rebuild a basic proof-of-concept UI.

Required v1 surfaces:

```txt
/
/inbox
/tasks
/tasks/:id
/action/:id
/skills
/skills/:id
/skills/instinct/:key
/wallet
/top-up
/top-up/:id
```

`/`, `/inbox`, `/tasks`, `/tasks/:id`, and `/action/:id` are file-route conventions seeded to the user and loaded through VFS route resolution, not hard-coded task/action product routes.

These convention files are seeded on first root load by a normal user-authored Reactor action, currently `seedRouteConventions`. The seeded pages are user files, normally shaped as `page.tsx` files under the matching VFS paths. Editing or removing them is a normal file mutation.

Reg/Dev mode is route search state:

```txt
?mode=reg   default user rendering mode
?mode=dev   debug/developer workspace shell
```

No `mode` means Reg. Dev surfaces may expose Reactor details; normal Reg copy should say PRO.

User-facing app name:

```txt
PRO
```

Description:

```txt
your Personal Relentless Operator.
```

Normal user-facing copy should not say Reactor.

Debug/dev surfaces may say Reactor.

Keep the shared UI package name unchanged in this pass.

## Main To PRO Feature Gap Map

| # | Old main feature | PRO mapping | Short take |
|---:|---|---|---|
| 1 | Tasks table | Files/folders tagged `kind=task`; rendered by `/`, `/inbox`, `/tasks`, `/tasks/:id` | Solved as convention. |
| 2 | Task status enum | Tags plus Reactor/read-derived state | No task status enum. |
| 3 | Subtasks | Child files/folders | Better than old model. |
| 4 | Inbox | `inbox=true`; missing `kind` only triggers classification | Positive tag wins. |
| 5 | Task body | `Task.md` | Settled. |
| 6 | Task summary | `Summary.md` | Settled. |
| 7 | Available skills | `availableSkillKeys` on files/directories | Needs design later. |
| 8 | Preferred intelligence | Resolved settings chain, pinned on action | Needs design. |
| 9 | Task budget | File/folder budget reserve | Same concept, new owner. |
| 10 | Current task | Current action directory | Directory is the runtime boundary. |
| 11 | Task conversation | Route/component over files plus actions | Convention, not table field. |
| 12 | Action details/debug | Typed `details` receipt viewer | Settled. |
| 13 | Drafts | Future `actions.status=draft` or draft table | Out of v1. |
| 14 | Composer | Reactor action composer | Same concept, new target model. |
| 15 | Task creation | `createTask()` composite skill | Settled for v1. |
| 16 | Schedules | Schedule trigger rows plus derived scheduler machinery | Deferred; needs design. |
| 17 | Components table | Renderable files and `page.tsx` route conventions | Slugs solved by files, no routes table. |
| 18 | Public component share | Future publishing/share layer | Out of v1 scope. |
| 19 | Render action output | `.mdx` result files | Correct; no inline action result. |
| 20 | MDX globals | Reactor/render primitives such as `<File id="">` | Important and security-sensitive. |
| 21 | Launcher task search | Server search over files/actions/indexes | Out of v1. |
| 22 | Launcher shortcuts | Root PRO shortcuts | Keep shell, drop task shortcuts. |
| 23 | Active-task wallet tab | Future file budget UI | Old UX should not return. |
| 24 | User info/memory | User-authored files rendered into instructions | Good fit. |
| 25 | Search tools | Instincts plus derived indexes | Out of v1. |
| 26 | Notifications/unread | Read cursors in v1; notifications later | Needs unread design. |
| 27 | Share/public publishing | Future route/share system | Out of v1 scope. |

## Open Design Discussions

1. Skills as files plus primitives: define the boundary between file-authored skill definitions, DB skills, instincts, composite skills, `availableSkillKeys`, schemas, costs, and permissions.
2. Intelligence settings: define inheritance, budget fallback, and when the resolved model is pinned.
3. File budgets: define file/folder reserves, inheritance, action authorization, release/refund, storage reserve, and wallet settlement.
4. Scheduling: design schedule trigger rows plus derived scheduler machinery without reviving the old schedules product.
5. Rendering and instruction includes: define safe MDX/TSX rendering and `<File id="">` behavior.
6. Unread mechanics: define cursors, watched scopes, and attention signals.
7. Directory boundary: every action runs in a directory; directory semantics carry boxes, triggers, budget lookup, runtime settings, and filesystem-inherited loop definitions.
8. Changeset naming/model: decide whether `changesets` should remain, be renamed to `changes`/`file_changes`, or be unified more tightly with `file_revisions`.

## Implementation Base

Start implementation from a clean branch/worktree based on `main`.

Do not continue from the messy `reactor-v1` working tree. Use it only as reference and selectively salvage proven pieces.

No migration from old data is required.

Disposable preview DBs may be reset/reseeded when schema drift makes them invalid.

Never drop DEV or PRODUCTION data.

## Validation Bar

Before claiming implementation complete:

```txt
bun typecheck
bun lint
bun test
app-installed Convex codegen
preview deploy/reset/reseed for disposable preview only
browser verification on the real dev server port
```

Browser verification must cover:

- `/`;
- `/inbox`;
- `/tasks`;
- one task/file page;
- `/skills`;
- one DB skill page;
- one instinct skill page;
- `/wallet`;
- `/top-up`;
- one `/action/:id` file-routed action page;
- composer loop/intelligence flow;
- file content reactivity;
- large file loader/handle behavior.

## Deferred Next Steps

### Action Drafts

Action drafts are out of v1.

Future direction:

```txt
actions.status = draft
```

Use draft actions first if enough. Add a separate `action_drafts` table only if composer sessions need multi-action queues or UI state that does not fit an action row cleanly.

Drafts are action drafts, not file drafts and not task drafts.

### File Links

File links and symlinks are removed from v1.

Do not implement loop binding through file links in this pass. If loop selection becomes necessary before the link model is settled, use explicit directory settings or direct trigger files instead of introducing a weak link primitive.

Future purpose:

- possible local selection of global loops/triggers/skills if that model is settled later;
- copy/fork/source provenance;
- attachments;
- read-only mounts/projections;
- usage relationships such as skill uses file;
- shared/public relationship graph.

V1 uses direct source fields where needed:

```txt
sourceOwner
sourceKey
sourceFile
```

Reintroduce `file_links` only when the general relationship table removes more complexity than it adds.

Minimal future POC shape:

```txt
file.kind = link
link.target = file id
```

Rules:

- links point to file IDs, not arbitrary paths;
- same-owner only at first;
- resolving a link always rechecks access;
- resolution is server-side;
- enforce max depth and cycle detection;
- action details pin local link file, resolved target file, and resolved target revision.

If links are ever materialized into a box:

- materialize as read-only copies/projections of pinned target revisions first;
- real symlinks are an implementation detail, not the product semantic;
- never expose host/provider paths;
- never let box execution mutate the global target through the local link;
- sync-back ignores projection artifacts and linked-path writes unless a later explicit "replace link with local file" action exists.

### Endpoints

Endpoints are removed from v1.

Future design:

- claim opaque webhook endpoint;
- URL does not reveal file id, trigger id, or user id;
- store slug hash and secret hash;
- generic non-leaking response for invalid slug, invalid secret, wrong auth, malformed access;
- valid inbound request resolves endpoint and trigger;
- handler runs through the trigger isolate with endpoint context;
- handler returns validated action proposals;
- accepted proposals create normal actions authored by trigger id;
- future instincts: `claimEndpoint`, `unclaimEndpoint`, `listEndpoints`.

Endpoint is transport, not a trigger condition.

### Indexes

`indexes` is deferred.

Future derived artifacts:

- embeddings;
- fulltext;
- summaries;
- previews.

Indexes are never source of truth. They derive from files/actions and can be stale/rebuilt.

Search should be exposed as instincts, not as a task-specific launcher hack.

Index operations need attribution primitives:

- create index;
- refresh index;
- remove index;
- inspect index state;
- record which action changed/generated index data.

Vector indexes or summaries that call third-party providers must record provider/model/usage/cost details. Regular index generation can happen through Reactor-scheduled actions or scheduler machinery, but canonical state stays in files/tags/actions.

### Schedules

Schedules are deferred.

Future schedules should be wake-source registrations that feed trigger evaluation.

Do not bring back the old schedules table/UI.

Best current direction:

- schedule intent can live in `.pro/triggers/*`, route/component conventions, or direct authored trigger rows;
- a derived scheduler index stores next run, compile errors, and Convex scheduled function ids;
- when a schedule file changes, rebuild the derived index;
- when a recurring schedule runs, compute and store the next run;
- scheduled firing creates a normal Reactor action;
- the author is the schedule file/trigger/action cause, not `system`.

Pure trigger scanning is not enough for efficient time-based wakeups. The derived scheduler index is machinery, not product truth.

### Notifications

Notifications are out of v1.

V1 keeps read cursors/unread mechanics. Future notifications may become lightweight attention rows for failures, trigger errors, budget issues, mentions, watched changes, and missed schedules.

### Storage Rent Billing

Object storage size and metadata are tracked in v1, but charged $0.

Future storage rent billing must become periodic/usage-based wallet transactions without pretending storage cost belongs to the last action that touched the file.

Storage rent is not a Reactor action.

Future model:

- files/directories carry a prepaid storage reserve;
- rent accrues deterministically from bytes, elapsed time, and a stored rate snapshot;
- settlement can happen lazily when the file/directory/wallet is touched;
- later background settlement may write accounting transactions, but not VFS actions;
- if reserve is exhausted, costly AI/runtime use can be blocked until funded;
- no fake `system` actor charges rent.

The action ledger answers what changed in the VFS. Storage rent answers what the platform is owed for keeping bytes alive. Keep those ledgers separate.

### Better Box Lifecycle Recovery

V1 includes a simple repair job for missed box lifecycle settlement.

This is technical debt.

Future design should avoid job-shaped cleanup when provider/webhook/lifecycle semantics can make settlement deterministic.

### Dynamic Execute Skills

Execute-kind DB skills are fixed command presets in v1.

Future dynamic execute skills need an explicit input-to-command protocol. Do not use unsafe shell interpolation.
