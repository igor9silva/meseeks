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

Pick file location from status directories:

- `active` -> `private/tasks/active/`
- `backlog` -> `private/tasks/backlog/`
- `completed` -> `private/tasks/completed/`
- any additional status -> `private/tasks/<status>/`

Use kebab-case filenames. Keep names short and descriptive. Do not include dates in filenames.
Default extension is `.mdx`.

## Subtask Rules

For a parent task with subtasks, use a directory:

- `private/tasks/<status>/<task-slug>/_index.mdx` for the parent task
- `private/tasks/<status>/<task-slug>/<subtask-slug>.mdx` for each child

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
tags: [security] # or [ux] or []
---
```

Rules:

- do not add `id`, `status`, `created`, `updated`, `parent`, `source`, `source_id`, `blocks`, or `blocked_by`
- ids, status, timestamps, parent links, and task source are derived by the indexer

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

## Final Checks

After creating the file:

1. Verify path matches status.
2. Verify frontmatter only includes allowed keys.
3. Verify subtask hierarchy is encoded via `_index.*` placement.
4. Confirm MDX headings and sections are present.
