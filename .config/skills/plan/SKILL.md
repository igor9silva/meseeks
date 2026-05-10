---
name: plan
description: Plan Meseeks task inbox/raw items into real tasks or references. Use when the user asks to plan a task, organize an inbox item, turn a raw capture into a public/private task or reference, split/merge/delete task files, or invokes Plan from Organizer or Codex.
---

# Plan

Turn raw captures into useful task-system files without laundering private mess into public history.

## Start Here

1. Read `tasks/README.md` first.
2. If Organizer provided task key/source/path context, use that exact context instead of guessing.
3. Read the target task file in full.
4. Read the parent `_index.*` chain from root to the target folder when present.
5. Inspect source metadata, sibling files, nearby duplicate candidates, reused tags, and repo context relevant to the task.

Nearby candidates means search both public and private task roots when available for title words, source URLs, TickTick IDs, slugs, transcript names, and distinctive quoted text.

## Decide

Produce a plan covering:

- title and short slug
- tags, reusing nearby/root tags before inventing new ones
- root: `tasks/` for public product/repo work, `private/tasks/` for sensitive, personal, raw, or unreviewed captures
- bucket: `active/`, `backlog/`, `references/`, `completed/`, or delete
- structure: single file, parent `_index.*`, child task, reference note, split, merge, or delete
- source metadata preservation: URLs, TickTick IDs, capture text, transcript pointers, import notes, dates, or raw source blocks

Plain text is fine. Add sections only when they make the task easier to act on.

## Safety Rules

- Default to a proposal/dry run when the item is ambiguous, private/public-sensitive, or mixed.
- Ask Igor before moving private material into `tasks/`, exposing personal details, handling security-sensitive content, or deciding a gray-line public/private case.
- Split mixed files instead of sanitizing by accident: public actionable task in `tasks/`, raw/sensitive source note in `private/tasks/references/`.
- Preserve imported source metadata close to the content it explains.
- Use `references/` for context, saved links, transcripts, prompts, examples, and research that is not itself completable work.
- Use `completed/` only for achieved work. Delete rejected task shells unless useful context should survive as a reference.
- Do not migrate topic folders into lifecycle buckets without user review.

## Apply Rules

Do not edit, move, delete, or create task files unless the user explicitly asks to apply the plan.

When applying:

1. Make the smallest filesystem change that matches the decision.
2. Keep frontmatter minimal and compatible with `tasks/README.md`.
3. Update source links or backlinks when splitting/merging.
4. Preserve the raw source in private references when public output must be cleaned.
5. Run `bun run tasks:build` only when task files changed and the current scope allows it.
6. Report changed files, deleted files, and any skipped build.

## Output

For dry runs, lead with the decision:

```md
Decision: move to `tasks/backlog/...` and split raw capture into `private/tasks/references/...`.

Why: the work is public product scope, but the capture contains private account details.

Proposed changes:
- ...

Needs Igor:
- confirm whether ...
```

For Organizer invocations, include the provided task key/source/path in the response so the caller can map the decision back to the selected item.
