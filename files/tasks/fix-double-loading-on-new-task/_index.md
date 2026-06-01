---
title: Fix double loading on new task
priority: low
tags: [bug, class:task, status:backlog]
---

When creating a new task, after submitting, we currently see:

1. loading
2. a quick render of `<QuickSeek>`
3. loading again

This should be a single loading transition.

Also check the related original note: menu loading should be instant, not insistent.
