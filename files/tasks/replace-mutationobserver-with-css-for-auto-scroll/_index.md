---
title: Replace MutationObserver with CSS for auto-scroll
priority: low
tags: [ux, class:task, status:backlog]
---

Use CSS `overflow-anchor` for chat/action-list auto-scroll instead of MutationObserver or `scrollTo()` where possible.

```html
<div id="scroller">
  ...
  ...
  <div id="anchor"></div>
</div>
```

```css
#scroller * {
  overflow-anchor: none;
}

#anchor {
  overflow-anchor: auto;
  height: 1px;
}
```

Browsers run scroll anchoring by default to prevent layout shifts.

Disable it on children, re-enable it on a 1px anchor at the end, and the scroll follows new content down on its own.

Reference: https://x.com/mannupaaji/status/2053829832757407907?s=20
