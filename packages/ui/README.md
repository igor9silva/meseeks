# @pro/ui

Shared React UI primitives and UI-only hooks used by PRO apps.

Local workspace consumers see current source directly. Use a published package or git tag if a project needs opt-in version bumps.

## shadcn

This package owns shared shadcn primitives. Run shadcn commands from this directory when adding or updating shared UI.

The package keeps flat imports:

```ts
import { Button } from '@pro/ui/button';
```

App-specific wrappers stay in the app that owns their dependencies.
