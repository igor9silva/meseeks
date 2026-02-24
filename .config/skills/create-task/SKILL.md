---
name: create-task
description: Create new task MDX files in the Meseeks task system with minimal frontmatter, correct folder placement, and filesystem-based parent/subtask structure. Use when the user asks to create a PROJECT task, add a backlog item, create subtasks, or scaffold task files.
---

# Create Task

Create tasks that comply with `tasks/README.md`.

## Required Read Order

Before creating any task file:

1. Read `tasks/README.md`.
2. If creating a subtask, read the full parent hierarchy (`_index.*` files from root to immediate parent).

## Placement Rules

Choose task root first:

- Use `tasks/` for Meseeks product/repo work (default)
- Use `private/tasks/` only for sensitive or personal work

Then pick status path inside that root:

- `active` -> `<root>/active/`
- `backlog` -> `<root>/backlog/`
- `completed` -> `<root>/completed/`
- any additional status -> `<root>/<status>/`

Use kebab-case filenames. Keep names short and descriptive. Do not include dates in filenames.
Default extension is `.mdx`.

## Subtask Rules

For a parent task with subtasks, use a directory:

- `<root>/<status>/<task-slug>/_index.mdx` for the parent task
- `<root>/<status>/<task-slug>/<subtask-slug>.mdx` for each child

Parent/child relationships come from filesystem shape, not frontmatter:

- `_index.*` is the parent task for that folder
- sibling/child task files are linked to nearest ancestor `_index.*`
- plain grouping folders without `_index.*` are organizational only

## Frontmatter Contract

Keep frontmatter minimal. Use:

```yaml
---
title: Human readable title
priority: critical | high | medium | low
tags: [security] # or [ux] or [debt] or [] or another appropriate tag
---
```

Rules:

- do not add `id`, `status`, `created`, `updated`, `parent`, `source`, `source_id`, `blocks`, or `blocked_by`
- ids, status, timestamps, parent links, and task source are derived by the indexer
- choose tags by primary task intent, not incidental wording in context

## Tag Selection

Tags are for durable categorization, not for summarizing every detail in the task text.

Use this selection order:

1. Check tags already used in the same task root (`tasks/` or `private/tasks/`) and prefer reusing one that matches the task intent.
2. Pick the smallest set of tags that captures the main intent (often one tag, sometimes none).
3. Add a new tag only when existing tags do not fit and the new tag is likely reusable by future tasks.

If tag intent is ambiguous, use `tags: []` instead of guessing.

Examples:

- bad: choose `ux` because context mentions UX pain, even though the task is primarily architecture/workflow work
- good: choose the tag that matches the primary deliverable; if none clearly fit, use `[]`

## Body Template

After frontmatter, use this structure:

```mdx
# <Task Title>

## Context
<background and why this exists>

## Objective
<clear measurable goal>

## Subtasks
- [ ] <first subtask>
- [ ] <second subtask>

## Progress Log
### YYYY-MM-DD
- Task created

## Notes
<links, references, constraints>
```

If there are no known subtasks yet, keep one checkbox item as a placeholder.

## Actionability Rule

Avoid writing meta tasks about "creating tasks" or "reviewing later".

Instead, make each task directly actionable:

- include concrete in-repo scope (specific files/modules)
- include measurable acceptance criteria (counts, tests, or behavior checks)
- include command evidence when the task references tooling failures

If you are updating an existing task and the title/intent changes materially, rename the task filename to a short, intent-aligned kebab-case slug and update references in the same pass.

Examples:

- bad: "Review TODOs and create backlog items"
- good: "Reduce TODO markers in `convex/tasks.private.ts` and `skills/createAITool.ts`; remove or resolve N markers and update tests"

## Final Checks

After creating the file:

- Verify path matches status.
- Verify root (`tasks/` vs `private/tasks/`) matches sensitivity and user intent.
- Verify subtask hierarchy is encoded via `_index.*` placement.
- Confirm MDX headings and sections are present.
- If title/intent changed materially, verify filename slug remains short and intent-aligned (it does not need to mirror the full title).
