# Vocabulary

Vocabulary is architecture. If the words are sloppy, the code gets slippery.

## Product Words

### directory

A directory is a file-like node that can contain children.

Directories are the user's organizing surface. A directory becomes an action scope when it contains a direct `.pro/` child. Triggers, budgets, boxes, compile, and action outputs resolve through the effective scope directory.

The current product term is `directory`.

### file

A file is a stable VFS node owned by a user.

A file can hold text, generated output, renderable code, configuration, task-like content, trigger source, instructions, action outputs, or another convention.

Directories are represented in the same file tree as files.

### revision

A revision is an immutable record of one file mutation.

Current direction:

- a file row points to its current revision;
- revisions record who caused the mutation, previous revision, paths, hashes, sizes, full patch data, and Object Storage pointers when needed;
- revisions are the reversible ledger for file state.

### action

An action is a durable ledger row for work.

Every mutation and provider call is attributable to an action. The action holds ownership and authorship. Actions answer who caused the work, which scope directory it ran in, what skill/runtime ran, what it cost, what changed, and what follow-up it caused.

Actions do not have `targetFile`. Files touched by an action appear in action input, details, output files, and revisions.

Every normal Reactor action starts enqueued. Reactor claim, perform load, and settle own the later lifecycle transitions. Claim-time unclaimable actions are skipped before perform with visible warnings and details. Root bootstrap is the narrow exception that creates a resolved `bootstrap` ledger action before normal actions can exist; that bootstrap action causes the normal `seed` reaction.

### changeset

A derived group of file revisions caused by one action.

`changeset(action)` means all `file_revisions` where `action` equals that action id. There is no durable `changeset` table in the core model.

### trigger

A durable Reactor rule projection that may schedule actions when an event occurs.

Triggers are union typed. Current trigger rows are compiled from filesystem source under `/.pro/triggers/*.ts`. The source file is canonical; the row is the queryable runtime rule.

Triggers have authors. A trigger-fired action is authored by the action that caused the trigger to match, not by a fake actor, not by the trigger row itself, and not by the action that originally authored the trigger rule.

Trigger receipts record the trigger source file/path/hash, compile provenance, source action, and matched revisions/paths so a reaction can explain why it exists without treating the trigger row id as the only clue.

Finite triggers use `maxUses`. Missing `maxUses` means unlimited use.

### skill

A Reactor action definition.

Every action uses a skill. Skills are runtime rows used for validation, claim, UI, and execution. Skill rows can be code-owned instinct projections, file-authored compile projections, or temporary manual rows.

File-authored skill declarations do not contain a `key`; compile infers identity from the source path.

### visible directory

The directory the user is currently browsing.

Explorer operations target the visible directory. The visible directory is not necessarily the action scope.

### scope directory

The nearest ancestor directory that contains a direct `.pro/` child.

Actions, budget lookup, trigger matching, compile, output file placement, runtime inheritance, and box reuse resolve to the scope directory. The action schema field is named `root`, but it stores the scope directory.

### control directory

The `.pro/` directory that belongs to the directory containing it.

`.pro/` holds runtime/control source such as settings, skills, triggers, render support components, and action output files. `.pro/` is the marker that makes its owning directory a scope. `.pro/` itself does not become the scope; actions started from `.pro/` or its descendants resolve to the directory that owns `.pro/`.

### page

A compiled renderable route projection derived from `page.tsx`.

`/example/page.tsx` renders at `/example`. Pages are not routes table rows and not product domains.

### box

A compute environment used by Reactor for execution.

Daytona is the current provider, but product copy says box. Boxes mount a VFS working tree. Box writes are proposals until Reactor validates and applies them.

### intelligence

A model/provider option used by `think` or higher-level skills.

Provider routing is honest. One provider is never presented as another provider.

The active intelligence providers are DeepSeek, Moonshot, and OpenAI.

### instinct

A skill implemented in code.

Instincts are skills Reactor is born with. Code is their canonical source. The `skills` table contains their runtime projection so the rest of the system can use one skill lookup path.

Each instinct owns its key, description, input schema, output schema, and performer. Instincts do not have load hooks.

An instinct performer returns a Reactor `PerformResult`. Reactor settles the action.

Current instincts include `seed`, which creates the first root runtime source files after bootstrap and queues the first compile reaction; `compile`, which compiles file-authored runtime source into derived `skills`, `triggers`, and `pages` rows; and `prepareUpload` / `commitUpload`, which make large browser uploads ledgered Reactor actions without sending bytes through Convex mutation arguments.

### Magic Rock

The intelligence/provider boundary.

Magic Rock prepares `think` context, selects models, dispatches to providers, calls providers, normalizes results, and returns receipts, usage, warnings, and errors to the action runtime.

### transaction

An energy ledger row.

Transactions record energy movement such as top-ups, action costs, storage costs, refunds, and free energy grants. A transaction is not a file mutation boundary. File mutation grouping is derived from actions and file revisions.

## Technical Words

### Reactor

The internal action lifecycle engine.

Reactor starts, claims, prepares, loads, performs, settles, records details, evaluates triggers, scans proposed file changes, and applies canonical mutations through the file/revision ledger.

Claim preparation is explicit. Actions that cannot be claimed are skipped with visible details instead of being silently ignored and left enqueued.

Reactor dispatches instincts through the instinct registry. It does not contain instinct behavior. Intelligence/provider execution belongs to Magic Rock.

Reactor consumes compiled skill rows for action validation and claim. Recursive source inheritance is compile-time work, not Reactor claim-time work. Developer UI can inspect the available skills for a root without becoming a second skill-resolution path.

Reactor code is split by lifecycle boundary: claim, perform, settle, apply, and stage. Shared Reactor contracts live in `schemas/reactorSchema.ts`.

Reactor is not a separate product and not a second app. Normal UI copy says PRO unless the user is in a developer/debug surface.

### Object Storage

The canonical store for file bodies and large artifacts.

Tigris is the current provider. Docs and UI say Object Storage unless discussing provider integration details.

### Convex

The control plane and realtime database.

Convex owns auth-linked user metadata, file identity, directory hierarchy, revisions, actions, action details, triggers, box lifecycle metadata, payment rows, and UI queries.

Convex is not canonical for large file bodies.

## Non-Product Terms

### workspace

`workspace` is not the current product model.

In repository instructions, `workspace` means the local development workspace. In product architecture, action scope is a scope directory.

### head

`head` is not part of the current product model.

Current state is the file row plus current revision pointer. History and reversibility come from revisions and patches.

### policy

`policy` is not part of the current product vocabulary. It is too broad and tends to hide real ownership, budget, security, and runtime boundaries.

### system author

There is no `system` actor.

Human actions are authored by users. Reactions are authored by the action that caused the trigger/reaction chain. Platform enforcement is code, not an author.

### targetFile

Actions do not have `targetFile`.

Actions run from a scope directory and can read or mutate zero, one, or many files. The touched files are an output of the action, not the action boundary.
