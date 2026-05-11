---
title: Import completed TickTick tasks with activity history
priority: high
tags: [source:ticktick]
---

# Import completed TickTick tasks with activity history

Build a deliberate import path for completed TickTick tasks.

Completed imports need more careful preservation than open tasks, especially task activity/history, completion metadata, and enough provenance to explain why the task exists in completed history.

Source: Organizer/TickTick migration planning

Important constraints:

- Preserve TickTick task IDs, list/project, completion timestamps, status, priority, tags, checklist state, attachments, and task activity/history. EVERY BIT OF INFO MATTERS.
- Decide whether imported completed history belongs in `private/tasks/completed/`, a source-batch folder, or another reviewed archival shape before importing.
- Do not mutate TickTick while importing.
