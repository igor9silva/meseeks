---
name: create-task
description: Create new task markdown files in the Meseeks task system with valid frontmatter, correct folder placement, and parent/subtask links. Use when the user asks to create a task, add a backlog item, open an active task, create subtasks, or scaffold task files under data/tasks.
---

# Create Task

Create tasks that comply with `data/tasks/README.md`.

## Required Read Order

Before creating any task file:

1. Read `data/tasks/README.md`.
2. If creating a subtask, read the full parent hierarchy (`_index.md` files from root to immediate parent).

## Placement Rules

Pick file location from status:

- `active` -> `data/tasks/active/`
- `backlog` -> `data/tasks/backlog/`
- `completed` -> `data/tasks/completed/`
- `blocked` -> keep in the work stream folder (`active` or `backlog`) with `status: blocked`

Use kebab-case filenames. Keep names short and descriptive. Do not include dates in filenames.

## Subtask Rules

For a parent task with subtasks, use a directory:

- `data/tasks/<status>/<task-slug>/_index.md` for the parent task
- `data/tasks/<status>/<task-slug>/<subtask-slug>.md` for each child

Set:

- parent task frontmatter: `parent: null`
- child task frontmatter: `parent: <parent-task-id>`

## Frontmatter Contract

Every task file must include:

```yaml
---
id: unique-task-id
title: Human readable title
status: active | backlog | blocked | completed
priority: critical | high | medium | low
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: [tag1, tag2]
blocks: []
blocked_by: []
parent: null
source: ticktick | manual | agent
source_id: null
---
```

Rules:

- keep `created` and `updated` equal on first creation
- use today's date in `YYYY-MM-DD`
- default `source` to `agent` unless user says otherwise
- default `source_id` to `null` unless imported from another system

## Body Template

After frontmatter, use this structure:

```markdown
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

## ID Strategy

Prefer readable kebab-case IDs based on the task slug. If a parent/child structure exists, keep IDs consistent and distinct (for example `subtasks-feature` and `subtasks-feature-notifications-events`).

## Final Checks

After creating the file:

1. Verify path matches status.
2. Verify frontmatter keys are complete and valid.
3. Verify `parent` points to the correct task ID for subtasks.
4. Verify `updated` matches the creation date.
5. Confirm markdown headings and sections are present.
