---
title: Bi-rendering system
priority: high
tags: [status:backlog, class:task]
---

Build a rendering system where the same conceptual component, action, task, or skill can render for humans in the UI and for models in AI-readable context.

This matters for Reactor because actions and task state should not need separate hand-written representations for humans and AI. The UI representation and the model-context representation should come from the same component-level source of truth whenever possible.

Useful references from the retired `bi-render` tag:

- [jsx-prompts](https://fables.gg/blog/introducing-jsx-prompts-build-complex-prompts-for-llms-with-jsx): JSX-to-Markdown prompt construction. Useful for rendering structured data into AI-readable Markdown.
- [Priompt](https://github.com/anysphere/priompt): JSX prompt trees with priorities, fallbacks, token budgeting, message components, source maps, and token reservations.
- [Tom Dorr's Priompt post](https://x.com/tom_doerr/status/1838000576992342149): warning that priority-heavy prompt design can hurt prompt-cache stability and become its own complexity.
- [mdx-prompt](https://github.com/edspencer/mdx-prompt): React/MDX components as prompt fragments, reusable prompt sections, and structured XML-like prompt tags.
