---
name: plan
description: Clarify and structure Meseeks tasks before execution or organization. Use when the user asks to plan a task, invokes Plan from Organizer or Codex, or Seek needs assumptions questioned before acting.
---

# Plan

Make a task clear enough to act on. For raw inbox captures, also turn them into useful task-system files without laundering private mess into public history.

## Start Here

1. Read `tasks/README.md` and `tasks/TAGS.md` first.
2. If Organizer provided task key/source/path context, use that exact context instead of guessing.
3. Read the target task file in full.
4. Read the parent `_index.*` chain from root to the target folder when present.
5. Inspect source metadata, sibling files, nearby duplicate candidates, reused tags, and repo context relevant to the task.
6. If the task is only links or mostly links, expand those links before planning. Use repo scraping skills/scripts for supported sources, and otherwise fetch, browse, or search enough to capture the page/post content. Preserve the original links and scraped source details in the task before trying to infer intent.
7. Interpret tags through `tasks/TAGS.md`. In particular, `to-read` is a private saved-reading queue signal, not an invite to classify the page as product work.

Nearby candidates means search both public and private task roots when available for title words, source URLs, TickTick IDs, slugs, transcript names, and distinctive quoted text.

## Clarify

Question assumptions before planning. If the goal, context, acceptance criteria, public/private boundary, or next action is unclear, ask Igor concrete questions instead of producing a fake-certain plan.

Break the task down until the next actor can execute it. If the task is already clear enough, keep the plan short.

When Plan was invoked by Seek, stop once the task is executable and hand back the execution plan. Seek should then act.

## Organize

Produce a plan covering:

- title and short slug
- tags, following `tasks/TAGS.md` and reusing nearby/root tags before inventing new ones
- root: `tasks/` for public product/repo work, `private/tasks/` for sensitive, personal, raw, or unreviewed captures
- bucket: `ideas/`, `active/`, `backlog/`, `references/`, `completed/`, or delete
- structure: single file, parent `_index.*`, child task, reference note, split, merge, or delete
- source metadata preservation: URLs, TickTick IDs, capture text, transcript pointers, import notes, dates, raw source blocks, attachments, and exported data

Plain text is fine. Add sections only when they make the task easier to act on.

## Safety Rules

- Default to a proposal/dry run when the item is ambiguous, private/public-sensitive, or mixed.
- Ask Igor before moving private material into `tasks/`, exposing personal details, handling security-sensitive content, or deciding a gray-line public/private case.
- Split mixed files instead of sanitizing by accident: public actionable task in `tasks/`, raw/sensitive source note in `private/tasks/references/`.
- Follow `tasks/TAGS.md` for source provenance: first imports preserve every possible bit of source information; later organizing can remove unused raw import debris after it has been committed.
- Use `references/` for context, saved links, transcripts, prompts, examples, and research that is not itself completable work.
- Use `completed/` only for achieved work. Delete rejected task shells unless useful context should survive as a reference.
- Flatten grouping-only folders when tags or UI filters can carry the organization.
- Keep nested folders when they model a real parent task, real subtasks, attachments, a source/import batch, or a reference collection with colocated assets.
- Treat `_index.*` as the folder's parent task or collection by default. Do not flatten it unless the index is only obsolete grouping scaffolding and Igor agreed it should become tags.

## Apply Rules

Do not edit, move, delete, or create task files unless the user explicitly asks to apply the plan.

When applying:

1. Make the smallest filesystem change that matches the decision.
2. Keep frontmatter minimal and compatible with `tasks/README.md`.
3. Update source links or backlinks when splitting/merging.
4. Preserve the raw source in private references when public output must be cleaned.
5. Use a short semantic filename, put readable page content before metadata, and keep `Source` as the very last section.
6. Run `bun run tasks:build` only when task files changed and the current scope allows it.
7. Report changed files, deleted files, and any skipped build.

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
