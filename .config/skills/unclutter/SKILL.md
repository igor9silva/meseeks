---
name: unclutter
description: Unclutter the Meseeks task system by directly organizing messy tasks, references, imports, tags, buckets, duplicates, stale active work, and public/private placement. Use when the user asks to unclutter, clean up tasks, organize everything, or fix task-system clutter.
---

# Unclutter

Organize the task system directly, then explain what changed and why.

## First Gate

Run `git status --short` before doing anything.

- If the worktree is clean, proceed.
- If the worktree is dirty, stop and ask Igor for permission to continue on top of the existing changes.
- Never stage, commit, amend, or reset. Igor reviews everything before committing.

## Read First

Read `tasks/README.md` before editing task files. Use that contract for roots, buckets, references, source metadata, deletion semantics, and private/public safety.

## What To Fix

Be broad and practical. Look for anything that makes the task system harder to trust or scan:

- duplicate tasks, duplicate imports, repeated source URLs, repeated TickTick IDs
- invalid or vague buckets
- stale `active/` work that is done, abandoned, or belongs elsewhere
- references pretending to be tasks
- tasks that should be references
- public tasks that should be private
- private tasks that should be public after review-safe cleanup
- raw imports that need triage or better source metadata
- weak titles, bad filenames, empty shells, outdated wording
- duplicated, misspelled, or overly-specific tags that should be unified
- topic folders that should become tags
- completed tasks that were not actually completed
- rejected work sitting in `completed/` instead of being deleted
- source-backed tasks missing traceability

Use judgment. The point is uncluttering, not satisfying a tiny checklist.

## Tag Hygiene

Keep tags short, reusable, and useful for organization. Do not add model names, provider names, vendor names, one-off feature names, or tags that repeat the title.

Prefer existing tags over creating new ones.

Use `source:ticktick` for every task imported from TickTick or carrying TickTick metadata.
Use `scraped` for captures that were expanded from a link.

When adding one of the broad organizational tags, scan for nearby tasks that should receive the same tag so the vocabulary stays useful instead of becoming accidental.

## How To Work

Inspect broadly, edit directly, and keep going until the requested scope is organized.

Ask Igor before:

- continuing in a dirty worktree
- moving private material into `tasks/`
- exposing personal, account, security, or sensitive source material
- deleting something when the intent is not obvious
- choosing between plausible meanings for a mixed task

When a task mixes public work with private context, split it: public actionable task in `tasks/`, private source/reference note in `private/tasks/references/`.

When something is rejected but has useful context, keep the context as a reference and remove the task shell.

## After Editing

Run the task index build when task files changed and the task scope allows it.

Report back in chat with:

- what changed
- why those changes reduce clutter
- anything skipped or left for Igor
- any privacy or source-traceability concerns
- exact files changed, moved, created, or deleted

End by explicitly asking Igor to review the working-tree diff before committing. Do not stage anything.
