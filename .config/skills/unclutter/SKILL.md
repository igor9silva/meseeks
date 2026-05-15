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

Read `.config/skills/unclutter/MEMORY.md` when present. Use it for durable decisions from prior Unclutter passes.

When Igor corrects an organizing decision, treat the correction as training data. If the correction is likely to recur, update `.config/skills/unclutter/MEMORY.md` in the same pass instead of relying on chat history.

For implementation tasks, inspect the relevant current code before deciding whether a task is stale, still valid, or should be folded into a parent task.

## Learning From Review Batches

When Igor reviews tasks one by one, treat each decision as a labeled example for future Unclutter runs.

Do both jobs:

1. Apply the current disposition exactly. If Igor says `delete`, delete. If he says `done`, move to `completed/` in the same root. If he says `public tech ref`, move to public `references/` with `tech`. If he says `flat into X`, move the content into X and delete the source. No need to keep `# Source` or `# TickTick source` blocks (they'll be git history anyway).
2. Extract the reusable reasoning behind the decision and update `.config/skills/unclutter/MEMORY.md` when it should help future autonomous Unclutter passes make the same call without Igor.

Do not confuse those jobs. The current task should not grow extra files, extra prose, visibility changes, or speculative structure just because Igor explained why he chose a destination. The explanation is training data for future inference, not permission to overwork the current item.

Write memory as decision heuristics, not as one-off transcripts. A good memory entry helps answer "what would Igor do with a similar task later?"

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

After Igor reviews an inbox item, do not leave it in inbox unless he explicitly says so. Move it to the best bucket and ask if the bucket is unclear.

Treat `_index.*` as the folder's parent task or collection by default. Flatten only when the index is obsolete grouping scaffolding and Igor agreed the grouping should become tags.

When flattening or merging imports, move the useful content, links, and attachments into the target task. Do not preserve generic `Source`, `TickTick source`, raw JSON, or "merged source note" blocks unless provenance itself is the useful content. Git history is enough for routine import provenance.

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
