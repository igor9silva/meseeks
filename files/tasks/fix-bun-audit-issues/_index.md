---
title: Fix bun audit issues
priority: high
tags: [security, debt, status:backlog, class:task]
---

# Fix bun audit issues

Bring the workspace dependency graph back to a clean `bun audit`.

Current snapshot from `bun audit` on 2026-06-07: 47 vulnerabilities, including 1 critical, 19 high, and 27 moderate.

Highest-risk findings to resolve first:

- `vitest <4.1.0` critical via `better-auth`
- `better-auth <1.4.17` high/moderate via `better-auth` and `@convex-dev/better-auth`
- `h3 <1.15.9`, `srvx <0.11.13`, `nitropack <2.13.4`, and `@tanstack/start-server-core <1.167.30` via TanStack Start/Nitro
- `undici >=7.0.0 <7.24.0`, `kysely >=0.26.0 <0.28.17`, `node-forge <=1.3.3`, `serialize-javascript >=5.0.0 <7.0.5`, `lodash`, `lodash.template`, `picomatch`, `postcss`, `yaml`, `ws`, `mermaid`, and `brace-expansion`

Do not just run broad updates and pray. Inspect whether fixes require direct dependency bumps, transitive overrides, removing unused tooling dependencies, or waiting on upstream packages.

Acceptance:

- `bun audit` exits cleanly, or every remaining advisory is documented with the exact dependency path and why it cannot be fixed yet.
- `bun typecheck` passes after dependency changes.
- Any dependency override added for this task has a nearby comment explaining why it exists and when it can be removed.
