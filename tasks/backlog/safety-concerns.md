---
title: "Karpathy comments on security"
priority: high
tags: [source:ticktick, ticktick-list:meseeks, ticktick-status:inbox, scraped, security]
---

## Context

https://x.com/karpathy/status/1934651657444528277

https://x.com/simonw/status/1909955640107430226

Original child note: `security issues with TOOLS`

## Expanded links

Scraped on 2026-05-12.

### Andrej Karpathy on prompt injection and LLM agents

Source: https://x.com/karpathy/status/1934651657444528277

Date: 2025-06-16T16:37:53.000Z

Author: [@karpathy](https://x.com/karpathy) / Andrej Karpathy

Text:

> RT to help Simon raise awareness of prompt injection attacks in LLMs.
>
> Feels a bit like the wild west of early computing, with computer viruses (now = malicious prompts hiding in web data/tools), and not well developed defenses (antivirus, or a lot more developed kernel/user space security paradigm where e.g. an agent is given very specific action types instead of the ability to run arbitrary bash scripts).
>
> Conflicted because I want to be an early adopter of LLM agents in my personal computing but the wild west of possibility is holding me back.

Metrics at scrape time: 3006 likes, 515 retweets, 102 replies, 434450 views, 45 quotes, 1783 bookmarks.

Quoted post by [@simonw](https://x.com/simonw):

> If you use "AI agents" (LLMs that call tools) you need to be aware of the Lethal Trifecta
>
> Any time you combine access to private data with exposure to untrusted content and the ability to externally communicate an attacker can trick the system into stealing your data!

Quoted post metrics at scrape time: 2340 likes, 532 retweets, 88 replies, 655058 views, 64 quotes, 1740 bookmarks.

### Simon Willison on MCP and tool prompt injection

Source: https://x.com/simonw/status/1909955640107430226

Date: 2025-04-09T13:04:44.000Z

Author: [@simonw](https://x.com/simonw) / Simon Willison

Text:

> Model Context Protocol has prompt injection security problems ... and it's not a problem with the protocol itself, this comes up any time you provide tools to an LLM that can potentially be exposed to untrusted inputs

User note from imported child task:

> security issues with TOOLS

Metrics at scrape time: 609 likes, 64 retweets, 20 replies, 62396 views, 9 quotes, 276 bookmarks.


## TickTick source

- Project: `🧞‍♂Meseeks (66b35a9a617f11216a574648)`
- List tag: `ticktick-list:meseeks`
- Task id: `685052bea58ad1692399a3c0`
- Column: `Inbox (66b9091be0871102361203fc)`
- Status tag: `ticktick-status:inbox`
- Priority: `5`
- Created: `2025-06-16T17:22:06Z`
- Updated: `2025-06-19T11:04:28Z`
- Sort order: `-9222219959397622000`

```json
{
  "importedAt": "2026-05-11",
  "tags": [
    "source:ticktick",
    "ticktick-list:meseeks",
    "ticktick-status:inbox"
  ],
  "tickTick": {
    "taskId": "685052bea58ad1692399a3c0",
    "parentTaskId": null,
    "projectId": "66b35a9a617f11216a574648",
    "projectName": "🧞‍♂Meseeks",
    "columnId": "66b9091be0871102361203fc",
    "columnName": "Inbox",
    "title": "Safety concerns",
    "content": "https://x.com/karpathy/status/1934651657444528277",
    "description": "",
    "notionBlockString": "",
    "status": 0,
    "deletionStatus": 0,
    "priority": 5,
    "progress": 0,
    "sortOrder": -9222219959397622000,
    "taskType": 0,
    "commentCount": 0,
    "tagString": "",
    "timeZone": "Europe/Lisbon",
    "startAt": null,
    "endAt": null,
    "createdAt": "2025-06-16T17:22:06Z",
    "updatedAt": "2025-06-19T11:04:28Z",
    "completedAt": null,
    "repeatRule": null,
    "repeatFrom": null,
    "repeatTaskId": null,
    "embeddedChildTaskIds": [
      "67f6d41f4ac69127c16908f2"
    ]
  },
  "children": [
    {
      "taskId": "67f6d41f4ac69127c16908f2",
      "parentTaskId": "685052bea58ad1692399a3c0",
      "title": "https://x.com/simonw/status/1909955640107430226",
      "content": "security issues with TOOLS",
      "description": "",
      "columnId": "66b9091be0871102361203fc",
      "columnName": "Inbox",
      "priority": 5,
      "sortOrder": -9221060185081202000,
      "createdAt": "2025-04-09T20:10:07Z",
      "updatedAt": "2025-06-19T11:04:28Z"
    }
  ],
  "attachments": [],
  "checklistItems": [],
  "reminders": []
}
```
