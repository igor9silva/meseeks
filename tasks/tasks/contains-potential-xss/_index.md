---
title: Detect potential XSS before rendering generated content
priority: high
tags: [security, source:ticktick, ticktick-list:meseeks, ticktick-status:inbox, status:backlog]
---

Add a server-side guard for obvious XSS payloads before generated or user-provided content reaches render/compile paths.

This is a reference implementation, not the whole safety model. It should complement the safe MDX/Babel work, not replace AST allowlists, sandboxing, or plain Markdown fallback.

Likely code paths:

- `apps/meseeks/convex/babel.ts`
- `apps/meseeks/skills/builtIn/render.ts`
- `tasks/tasks/make-mdx-safe/_index.md`

![containsPotentialXSS screenshot](attachments/b3a5f538-i2025-04-10-15-41-35.jpg)

Image transcription:

```ts
export function containsPotentialXSS(input: string): boolean {
  if (!input) return false;

  // Check for common XSS patterns
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /data:text\/html/gi,
    /on\w+=/gi,
    /eval\(/gi,
    /expression\(/gi,
  ];

  return xssPatterns.some((pattern) => pattern.test(input));
}
```

## Attachments

- [I2025-04-10 15:41:35.jpg](attachments/b3a5f538-i2025-04-10-15-41-35.jpg) (174462 bytes)

## TickTick source

- Project: `🧞‍♂Meseeks (66b35a9a617f11216a574648)`
- List tag: `ticktick-list:meseeks`
- Task id: `67f7d8afb230d111b3a5f513`
- Column: `Inbox (66b9091be0871102361203fc)`
- Status tag: `ticktick-status:inbox`
- Priority: `0`
- Created: `2025-04-10T14:41:51Z`
- Updated: `2025-04-10T16:13:24Z`
- Sort order: `-9221059635324339000`
