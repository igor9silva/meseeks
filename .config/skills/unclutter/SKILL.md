---
name: unclutter
description: Unclutter the Meseeks task system by directly organizing messy tasks, references, imports, tags, buckets, duplicates, stale active work, and public/private placement. Use when the user asks to unclutter, clean up tasks, organize everything, or fix task-system clutter.
---

# Unclutter

Organize the task system directly. Uncluttering means making the repo task system closer to what Igor would have done by hand.

## First Gate

Run `git status --short` before doing anything.

- If the worktree is clean, proceed.
- If the worktree is dirty, stop and ask Igor for permission to continue on top of the existing changes.
- Never stage, commit, amend, or reset. Igor reviews everything before committing.

## Read First

Read `tasks/README.md` before editing task files. Use that contract for roots, buckets, references, source metadata, deletion semantics, and private/public safety.

Read `tasks/TAGS.md` before adding, removing, renaming, or interpreting tags. It is the canonical tag registry.

Read `.config/skills/unclutter/MEMORY.md` when present. Use it for durable decisions from prior Unclutter passes.

For implementation tasks, inspect the relevant current code before deciding whether a task is stale, still valid, or should be folded into a parent task.

## Learning From Review Batches

When Igor reviews tasks one by one, treat each decision as a labeled example for future Unclutter runs.

Apply the current disposition exactly. Mechanical feedback is mechanical:

- `delete`, `kill`, `stale`: delete it.
- `done`: move it to `completed/` in the same root and leave the body alone.
- `public tech ref`: move it to public `references/` with `tech`.
- `human:to-read`: keep it as a private reading queue item in inbox.
- `flat into X`, `fold into X`, `merge into X`: move only the useful content into X, in the natural place, then delete the source.

Then extract the reusable reasoning. If it helps classify a similar future task, update `.config/skills/unclutter/MEMORY.md` in the same pass. Do not turn Igor's explanation into extra body text on the current task.

Do not invent modes, frameworks, or taxonomies around review feedback. The learning loop is simple: execute the item, capture the durable judgment, get better next time.

## What To Fix

Be broad and practical. Look for anything that makes the task system harder to trust or scan:

- duplicate tasks, duplicate imports, repeated source URLs, repeated TickTick IDs
- invalid or vague buckets
- stale `active/` work that is done, abandoned, or belongs elsewhere
- references pretending to be tasks
- tasks that should be references
- public tasks that should be private
- private tasks that should be public after review-safe cleanup
- raw imports that need planning or better source metadata
- weak titles, bad filenames, empty shells, outdated wording
- duplicated, misspelled, or overly-specific tags that should be unified
- grouping-only folders that should be flattened because tags or UI filters now carry that organization
- nested folders with `_index.*` that must be preserved because they are real parent tasks or reference collections
- completed tasks that were not actually completed
- rejected work sitting in `completed/` instead of being deleted
- source-backed tasks missing traceability
- link-only tasks whose title is still just a URL or a meaningless import label
- image/video attachments that were left behind or not rendered after a merge

Use judgment, but do not override an explicit disposition Igor already gave for a specific task.

## Style Rules

- Do not write obvious context back into the task. A task in `completed/` does not need "done already". A task in `references/` does not need "reference capture".
- Do not write review labels into task prose. If Igor says something is "low-relevance", "stale", "small", or "just a link", use that to choose the disposition; do not paste the label into the file.
- Do not add generic `Source`, `TickTick source`, raw JSON, "source preserved", "merged source note", or "examples from original task" blocks when merging imports. Git history carries routine provenance.
- Preserve useful original context. If detail may matter, keep it compactly in the body or as a named link. Do not summarize away the reason the capture existed.
- Prefer named Markdown links in prose. Bare URLs are for raw source lists or when the URL itself is the artifact.
- Do not start every task with `## Context`. Start with the content.

## Tag Hygiene

Follow `tasks/TAGS.md`. Do not redefine tag semantics here.

Treat the registry as executable cleanup guidance. If it constrains a tag to a bucket, visibility, or canonical task, fix the files that violate it instead of only noting the mismatch.

Do not apply tag cleanup to `completed/`. Completed tasks are history; leave their paths, visibility, tags, and bodies alone unless Igor explicitly asks.

When adding one of the broad organizational tags, scan for nearby tasks that should receive the same tag so the vocabulary stays useful instead of becoming accidental.

Keep source namespace tags when they preserve import traceability. Remember that `ticktick-status:*` is source metadata from TickTick, not the current filesystem bucket.

`human:*` tags mean blocked on Igor or another human. Do not auto-complete or over-organize them away during broad cleanup.

## How To Work

Inspect broadly, edit directly, and keep going until the requested scope is organized.

Ask Igor before:

- continuing in a dirty worktree
- moving private material into `tasks/`
- exposing personal, account, security, or sensitive source material
- deleting something when the intent is not obvious
- choosing between plausible meanings for a mixed task

When a task mixes public work with private context, split it: public actionable task in `tasks/`, private source/reference note in `private/tasks/references/`.

When something is rejected but Igor did not say the source is still useful, delete it. Do not salvage interesting-looking debris just because it looks interesting.

After Igor reviews an inbox item, do not leave it in inbox unless he explicitly says so. `human:to-read` is one of those explicit exceptions when Igor says it is just something to read. Move other reviewed items to the best bucket and ask if the bucket is unclear.

Treat `_index.*` as the folder's parent task or collection by default. Flatten only when the index is obsolete grouping scaffolding and Igor agreed the grouping should become tags.

When flattening or merging imports, move the useful content, links, and attachments into the target task. If a task has local attachments, keep or create a folder task so media stays beside the Markdown. Routine raw import data can be removed after the imported snapshot has already been committed once.

## After Editing

Run the task index build when task files changed and the task scope allows it.

Update `.config/skills/unclutter/MEMORY.md` with durable decisions, corrected mappings, recurring skip reasons, or settled Igor preferences that future Unclutter runs should know.

Report back in chat with:

- what changed
- why those changes reduce clutter
- anything skipped or left for Igor
- any privacy or source-traceability concerns
- exact files changed, moved, created, or deleted

End by explicitly asking Igor to review the working-tree diff before committing. Do not stage anything.
