---
title: visual-json
tags: [tech, ux, source:ticktick, ticktick-list:meseeks, ticktick-status:inbox, class:reference]
---

visual-json: JSON editing with human-first ergonomics.

TypeScript-friendly visual JSON editor library. The interesting part for us is not just "nice JSON UI"; it is a reusable editor architecture for structured data.

- headless core package for tree model, operations, schema resolution, diffing, search, and validation
- React package with TreeView, FormView, DiffView, RawView-style editing components
- Vue 3 package with similar components
- YAML package for parsing, serializing, and schema-detecting YAML files
- VS Code extension for JSON, JSONC, YAML, and YML visual editing
- schema-aware form editor with descriptions, required fields, and enum dropdowns
- tree view with expand/collapse, drag-and-drop reordering, keyboard navigation, and context menus
- diff view for side-by-side edited-vs-original JSON
- raw view for direct text editing
- sample/demo stack shows modern frontend package assumptions: React, Next, TypeScript, Node 18+

Source: [Chris Tate on X](https://x.com/ctatedev/status/2025041118937620913?s=12)

Docs: [visual-json getting started](https://visual-json.dev/docs/getting-started)
