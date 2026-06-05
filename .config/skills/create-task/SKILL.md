---
name: create-task
description: Create simple Meseeks task or reference folders in the right public/private root. Use when the user asks to create a task, backlog item, inbox capture, reference note, imported task, or source-backed task file.
---

# Create Task

Create the smallest useful task file. Default shape is title plus plain body. Add metadata only when it helps future planning or preserves a source.

## Read First

Read `files/README.md` before creating or moving task files. Read `files/TAGS.md` before adding or changing tags. If the requested task is a subtask, also read the nearest parent `_index.*`.

## Placement

Pick the root first:

- `files/` is for public Meseeks product and repo work.
- `private/files/` is for private, sensitive, personal, raw-import, and unreviewed staging material.
- Raw imports, phone captures, and TickTick captures default to `private/files/inbox/`.
- If public vs private is ambiguous, ask Igor instead of guessing.

Use one of the four root child tasks:

- `inbox/` for unplanned captures.
- `ideas/` for side projects, product ideas, use cases, and things worth trying.
- `tasks/` for actionable work.
- `references/` for searchable context, not completable tasks.

Reviewed non-inbox files need the matching class tag:

- `class:idea` under `ideas/`
- `class:task` under `tasks/`
- `class:reference` under `references/`

Do not add `class:*` to root or inbox captures.

Actionable files under `tasks/` need one lifecycle tag:

- `status:backlog`
- `status:active`
- `status:completed`

Private saved-reading and other human-blocked files follow `files/TAGS.md`: use the relevant `human:*` tag.

Decided-not-to-do tasks should be deleted. Do not move rejected ideas to `status:completed`.

## File Shape

Use kebab-case folder names. Keep names short. Do not include dates unless the date is the subject.

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

Omit fields you do not need. Do not add derived metadata such as `id`, `created`, `updated`, or `parent`.

## Source-Backed Tasks

For imported or source-backed tasks, follow `files/TAGS.md`: the first import should preserve every possible bit of source information.

```md
Source: TickTick Inbox
TickTick ID: 67abc...
URL: https://example.com/source
Captured: 2026-05-10
```

Keep raw source text, transcript pointers, URLs, import notes, timestamps, IDs, attachments, and raw exported data when importing. If a file mixes public work with private raw material, split it into a public task and a private reference.

If Igor gives an exact title/body, use that title/body. Do not "improve" it into a summary, demand analysis, or generic backlog wrapper.

Demand references are raw market signals. If Igor provides the title/body, use that title/body directly. Do not add analysis sections like "Demand signal", "Requested features", "Why it matters", or other prose that only restates the `demand` tag. For tweet demand references, the tweet is the content: render attached tweet media with the tweet text in the body, then put source metadata/backups last.

Do not add classification boilerplate. A file in `references/` does not need "reference" in its title/body. A file tagged `demand` does not need to explain that it is a demand signal. A task under `tasks/` should be named as the actual action, not "build a backlog idea around...".

If the source was expanded from a link, write from the expanded source, not the stale import title. If the source names a specific model, library, product, or request, use that exact name in the title. Keep dated caveats in the body with "we" when the note is about our project state.

Dictated Meseeks planning notes often contain speech-to-text artifacts. Treat `m6` and `me6` as transcription errors for "Meseeks". Do not create product names, task titles, or GTM/architecture notes from those artifacts.

For saved-reading backups, the body should be the captured page content, not a `Summary` / `Key Points` analysis unless Igor asked for analysis. Keep the filename short and put `## Source` at the very end.

## Subtasks

Filesystem shape defines parentage:

- `<root>/<section>/<task-slug>/_index.mdx` for the parent.
- `<root>/<section>/<task-slug>/<child-slug>/_index.mdx` for a child.

Every task is a folder. Plain folders without `_index.*` are not tasks.

## Final Check

Before finishing:

- Path uses the right root and one of the four root child tasks.
- Reviewed non-inbox files have exactly one matching `class:*` tag.
- Actionable work under `tasks/` has exactly one `status:*` tag.
- `references/` files are written as context, not fake tasks.
- Imported/source-backed files preserve source metadata.
- Public/private ambiguity was resolved by Igor.
- The file is simpler than a form template. If it reads like ceremony, cut it.
