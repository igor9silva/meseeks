# Tasks

This folder is the public task system for Meseeks product and repo work. Use filesystem buckets as the mental model.

## Roots

- `tasks/` is public. Put product, repo, roadmap, and implementation work here when it is safe to review in the repo.
- `private/tasks/` is private. Put sensitive material, personal staging, raw imports, phone captures, and unreviewed source dumps there.

Raw TickTick and phone captures default to `private/tasks/inbox/`. Move them public only after review.

## Buckets

Use these top-level buckets:

- `inbox/` for unplanned captures.
- `ideas/` for side projects, product ideas, use cases, and things worth trying.
- `active/` for work we are doing now or committed to doing next.
- `backlog/` for valid work we might do later.
- `references/` for searchable context that is not a completable task.
- `completed/` for achieved work only.

Do not create topic folders by default. Use short tags for reusable organization, like `security`, `convex`, `organizer`, `legacy`, or `billing`. Use `intelligence` only for AI model/model-provider support tasks. Use `skill` for skills/integrations we want to add to Meseeks. Use `demand` for public demand signals that validate Meseeks. Use `customization` for user-driven app customization. Use `bi-render` for systems that render the same component/task/action toward humans and AI. Use `legacy` for pre-Reactor-v1 work kept as context until v1 replaces or revalidates it.

Nested folders are for real parent tasks, source/import batches, or reference collections. They are not a substitute for tags.

Flatten grouping-only folders once tags or UI filters can carry the organization. Keep a nested folder when the folder itself is part of the task shape: a parent task with real child tasks, an import/source batch that needs shared provenance, or a reference collection that needs colocated assets.

An `_index.*` file usually means the folder is the parent task or collection. Do not flatten that folder unless the index is only obsolete grouping scaffolding and Igor agreed it should be replaced by tags.

Example:

```yaml
tags: [intelligence]
```

Not:

```txt
tasks/intelligences/agent-cpm-report.md
```

`intelligences` is a topic direction, not a lifecycle bucket.

## Task Shape

Plain text tasks are first-class. Do not force every file into `Context`, `Objective`, `Subtasks`, `Progress`, and `Notes`.

A good task file needs enough information to act:

- what should happen
- why it matters
- important constraints or source material
- source metadata when imported

Use structure when it helps. Skip it when it is ceremony.

## Source Metadata

Imported tasks must preserve where they came from. Keep TickTick IDs, source URLs, capture text, tweet URLs, transcript references, or import notes close to the relevant content.

Example:

```md
Source: TickTick Inbox
TickTick ID: 67abc...
URL: https://x.com/...
Captured: 2026-05-10
```

For scraped links, keep the source URL even if the body has been summarized. For transcript-backed tasks, put the real synthesis in the main body and keep source quotes or transcript pointers where they help verify the interpretation.

## Inbox Planning

Plan in batches. Do not perfect one capture while the rest of the inbox rots.

For each inbox item:

1. Move it to `ideas/`, `active/`, `backlog/`, `references/`, or `completed/`.
2. Delete it if we decided not to do it.
3. Split it if it mixes public work with private source material.

Mixed task example:

- public actionable task: `tasks/backlog/improve-link-imports.md`
- private source note: `private/tasks/references/ticktick/link-import-capture.md`

## References

References are searchable context, not promises to act.

Use `references/` for research notes, source dumps, prompts, transcripts, saved links, and examples that may inform future work. If a reference creates work, write a separate task in `inbox/`, `ideas/`, `active/`, or `backlog/` and link back to the reference.

## Completed Or Deleted

`completed/` means the work happened. It is not a graveyard for ideas we rejected.

If we decide not to do a task, delete the file. If the file contains useful context, move only that context to `references/` and delete the task shell.

## Private To Public

Private-to-public movement requires review.

Before moving a private task into `tasks/`:

- remove secrets, personal data, private account details, and raw sensitive captures
- preserve useful source metadata
- keep private source notes in `private/tasks/references/` when the public task should not include the raw material
- split mixed files instead of laundering private context into a public task

Meseeks product and repo work should end up public when safe. Personal staging and raw imports can stay private.

## Agent Workflow

When working on tasks:

- work in batches
- keep filesystem bucket semantics intact
- preserve source metadata
- keep public and private roots separate
- split mixed public/private files
- delete rejected work instead of marking it completed
- flatten grouping-only folders instead of preserving directory buckets as topics
- run the task index build only when task files changed and the task scope allows it

Do not overfit to Organizer internals. The contract is simple: roots define safety, buckets define lifecycle, file content carries the work.
