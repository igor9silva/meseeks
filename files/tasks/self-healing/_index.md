---
title: "self healing"
priority: low
tags: [skill, source:ticktick, ticktick-list:meseeks, ticktick-status:inbox, status:backlog, class:task]
---

Create a `fix` soft skill for retrying failed tool calls.

It should receive the failed call, input, output, error, task context, and relevant constraints, then apply the smallest correction and retry when that is safe.

This is low priority because models fail less often now, but failed tool calls should still be recoverable without forcing the user to manually reconstruct context.
