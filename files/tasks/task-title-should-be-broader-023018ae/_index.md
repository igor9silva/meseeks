---
title: "Preserve the task goal when updating instructions"
priority: high
tags: [source:ticktick, ticktick-list:meseeks, ticktick-status:inbox, status:backlog, class:task]
---

`instruct()` is too willing to rewrite a task as if the latest secondary activity is now the main goal.

For longer tasks, the task can have a stable primary goal while the current turn adds some extra thing, tangent, constraint, or correction. The update should preserve that broader goal and fold the new information into the right place instead of retitling or reshaping the task around the newest local detail.

This is probably a context-shape problem: the model sees the latest instruction as the dominant source of truth, then overfits the title/body to it. The diff idea should help because `updateInstructions()` can show humans and models what actually changed, making it easier to preserve the long-lived goal while recording the local update.

Original note:

- Task title should be broader and not change frequently.
- Sonnet seems to do that right, Kimi not.

## TickTick source

- Project: `🧞‍♂Meseeks (66b35a9a617f11216a574648)`
- List tag: `ticktick-list:meseeks`
- Task id: `68888267edf1d16f023018ae`
- Column: `Inbox (66b9091be0871102361203fc)`
- Status tag: `ticktick-status:inbox`
- Priority: `3`
- Created: `2025-07-29T08:12:23Z`
- Updated: `2025-08-01T08:20:46Z`
- Sort order: `-9222795998146646000`

```json
{
  "importedAt": "2026-05-11",
  "tags": [
    "source:ticktick",
    "ticktick-list:meseeks",
    "ticktick-status:inbox"
  ],
  "tickTick": {
    "taskId": "68888267edf1d16f023018ae",
    "parentTaskId": null,
    "projectId": "66b35a9a617f11216a574648",
    "projectName": "🧞‍♂Meseeks",
    "columnId": "66b9091be0871102361203fc",
    "columnName": "Inbox",
    "title": "Task Title should be broader,",
    "content": "not change frequently.\n\nSonnet seems to do that right, Kimi not.",
    "description": "",
    "notionBlockString": "",
    "status": 0,
    "deletionStatus": 0,
    "priority": 3,
    "progress": 0,
    "sortOrder": -9222795998146646000,
    "taskType": 0,
    "commentCount": 0,
    "tagString": "",
    "timeZone": null,
    "startAt": null,
    "endAt": null,
    "createdAt": "2025-07-29T08:12:23Z",
    "updatedAt": "2025-08-01T08:20:46Z",
    "completedAt": null,
    "repeatRule": null,
    "repeatFrom": null,
    "repeatTaskId": null,
    "embeddedChildTaskIds": []
  },
  "children": [],
  "attachments": [],
  "checklistItems": [],
  "reminders": []
}
```
