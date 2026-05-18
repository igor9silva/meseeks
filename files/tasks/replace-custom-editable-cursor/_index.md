---
title: Replace custom editable cursor
priority: low
tags: [ux, source:ticktick, ticktick-list:meseeks, ticktick-status:inbox, status:backlog, class:task]
---

Replace the ugly custom SVG cursor shown over editable surfaces.

We may decide not to keep a custom cursor at all. If we keep one, it should feel intentional and match the editable affordance instead of looking like a one-off asset.

References to compare:

- [Magic UI Pointer](https://magicui.design/docs/components/pointer): custom pointer treatment for interactive surfaces.
- [Magic UI Border Beam](https://magicui.design/docs/components/border-beam): animated border highlight that could work as an editable focus treatment.
- [Magic UI Magic Card](https://magicui.design/docs/components/magic-card): hover/spotlight card treatment that could inform editable surface feedback.
- [React Gradient Glow](../../references/react-gradient-glow/_index.md): Tailwind glow reference that could be used instead of, or alongside, a custom pointer.
