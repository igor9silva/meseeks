---
name: create-task
description: Create simple Meseeks task or reference files in the right public/private root and lifecycle bucket. Use when the user asks to create a task, backlog item, inbox capture, reference note, imported task, or source-backed task file.
---

# Create Task

Create the smallest useful task file. Default shape is title plus plain body. Add metadata only when it helps future planning or preserves a source.

## Read First

Read `tasks/README.md` before creating or moving task files. If the requested task is a subtask, also read the nearest parent `_index.*`.

## Placement

Pick the root before the bucket:

- `tasks/` is for public Meseeks product and repo work.
- `private/tasks/` is for private, sensitive, personal, raw-import, and unreviewed staging material.
- Raw imports, phone captures, and TickTick captures default to `private/tasks/inbox/`.
- If public vs private is ambiguous, ask Igor instead of guessing.

Use only these buckets:

- `inbox/` for unplanned captures.
- `active/` for work happening now or committed next.
- `backlog/` for valid work we might do later.
- `references/` for searchable context, not completable tasks.
- `completed/` for achieved work only.

Decided-not-to-do tasks should be deleted. Do not move rejected ideas to `completed/`.

## File Shape

Use kebab-case filenames. Keep names short. Do not include dates in filenames unless the date is the subject.

Default body:

```md
# Task title

Plain body with enough context to act.
```

Do not force `Context`, `Objective`, `Subtasks`, `Progress`, or `Notes`. Use headings and checkboxes only when they make the task clearer.

Frontmatter is optional and should stay minimal:

```yaml
---
title: Human readable title
tags: []
priority: medium
---
```

Omit fields you do not need. Do not add derived metadata such as `id`, `status`, `created`, `updated`, or `parent`.

## Source-Backed Tasks

For imported or source-backed tasks, preserve source metadata close to the body:

```md
Source: TickTick Inbox
TickTick ID: 67abc...
URL: https://example.com/source
Captured: 2026-05-10
```

Keep raw source text, transcript pointers, URLs, or import notes when they matter. If a file mixes public work with private raw material, split it into a public task and a private reference.

## Subtasks

Filesystem shape defines parentage:

- `<root>/<bucket>/<task-slug>/_index.mdx` for the parent.
- `<root>/<bucket>/<task-slug>/<child-slug>.mdx` for a child.

Plain folders without `_index.*` are topic folders, not tasks.

## Final Check

Before finishing:

- Path uses the right root and one of the five buckets.
- `references/` files are written as context, not fake tasks.
- Imported/source-backed files preserve source metadata.
- Public/private ambiguity was resolved by Igor.
- The file is simpler than a form template. If it reads like ceremony, cut it.
