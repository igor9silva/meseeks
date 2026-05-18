---
title: "Unrender action output"
priority: low
tags: [source:ticktick, ticktick-list:meseeks, ticktick-status:inbox, ux, status:backlog, class:task]
---

# Unrender Action Output

Add an "unrender" control for action output when rendering causes performance issues or the user wants to collapse heavy generated UI/MDX.

Current behavior already avoids rendering very large generic action results inline, but there is no explicit per-action control to unload/collapse rendered output after it is on screen.
