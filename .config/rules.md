You are working on the Meseeks codebase. Follow these rules strictly.

## Type Safety (CRITICAL)

Never bypass TypeScript's type system. These patterns are forbidden:

- `@ts-expect-error` / `@ts-ignore` - Do not suppress TypeScript errors
- `any` - Do not use implicit or explicit `any`
- `as Type` assertions - Do not lie to the type system

When types don't match:

1. Check if the library API changed
2. Check if internal types need updating
3. Use type guards (`typeof`, `instanceof`, custom guards)
4. Ask the user if there's a design issue
5. Use zod schemas for runtime validation of external data

If you cannot implement a type-safe solution, stop and ask for help rather than writing unsafe code.

## Tech Stack

- Runtime & package manager: `bun` (not npm/yarn/pnpm), use `bunx` instead of `npx`
- Typecheck: `bun typecheck`
- Router: TanStack Router (not Next.js)
- Backend: Convex
- Styling: Tailwind + shadcn-like components
- Forms: TanStack Form with Zod validation
- Toasts: Sonner

## Code Style

### Formatting
- Add blank `//` comment lines after function declarations for readability (prettier workaround)
- Do not remove existing comments - user reviews manually
- Do not change indentation
- Prefer `Boolean()` over `!!`
- Prefer `const` over `let`
- Comments: lowercase, no capitalization
- One-liner guards: `if (!element) return;` - use braces only when it doesn't fit on one line

### Naming
- Booleans: `isSomething`, `hasSomething`, `shouldDoSomething` (yes/no question format)
- Component files: PascalCase (`TaskDetail.tsx`), except `~/components/ui` primitives
- Event handlers: `handleSubmit`, `handleTaskUpdate`, `handleDialogClose`

### Ternaries
- Only use when it fits on a single line
- For complex conditions, extract to variables or early returns

### Imports
- Add imports AFTER first usage (prevents prettier from removing unused imports)
- Import specific React hooks: `import { useState, useEffect } from 'react'`
- Never import entire React library

### Tailwind
- Never use hardcoded values like `min-w-[256px]`
- Use Tailwind conventions: `min-w-64`

### Performance
- Prefer `array.concat()` over spread syntax
- Avoid unnecessary re-renders

## Logging

- `console.error` - fatal errors, unhandled exceptions (triggers max priority admin notification)
- `console.warn` - non-breaking issues that shouldn't happen (triggers normal admin notification)
- `console.info` - always visible in logs
- `console.debug` - debug sessions only (not recorded unless LOG_LEVEL increased)

## Component Organization

```
components/
├── ui/           # Primitive components (shadcn/ui)
├── layout/       # Layout primitives
├── actions/      # Action components
└── *.tsx         # Shared and feature components
```

- Main component first in file, helper components after
- Related components that are rarely used alone go in their own directory (e.g., `~/components/skills` for `/skills` route)

## React Patterns

### State
```tsx
const [isLoading, setIsLoading] = useState(false);
const [hasError, setHasError] = useState(false);
```

### Conditional Rendering
```tsx
// avoid nested ternaries
if (isLoading) return <Loading />;
if (hasError) return <Error />;
return <Content />;
```

### Queries
- Suspense queries (preferred) suspend to nearest `<Suspense>` and throw to nearest `<ErrorBoundary>`
- Regular queries handle their own pending and error states
- Use Convex with TanStack Query: `convexQuery`, `useSuspenseQuery`

### Validation
Always use Zod for any kind of validation.

## Convex Backend

### CRITICAL: Never deploy directly to production
Do not run `bunx convex deploy` - this deploys to production.

### File Structure
- `public.ts` - client-callable functions (queries, mutations, actions)
- `private.ts` - internal functions prefixed with underscore (`_functionName`)
- `schemas/` - Zod schemas
- `lib/` - shared utilities

### Public Functions
- Descriptive names without underscores
- Validate args with Zod schemas
- Must include authentication/authorization checks

### Private Functions
- Always prefix with underscore: `_functionName`
- Use `internalQuery`, `internalMutation`, `internalAction`
- No auth checks (internal use only)

### Authorization
- Never mention "authorization" in error messages - use generic "not found"
- Check ownership before public-facing operations

### Database
- Always use indexes for queries
- Never use `filter()` without explicit user consent
- Use `zid('tableName')` for typed IDs

### Environment Variables
- Always import from `./schemas/envSchema`: `import { env } from './schemas/envSchema'`
- Never use `process.env` directly

### Types
- Use Zod schemas for all custom types
- Avoid rewriting schemas - import and use `z.infer()`
- Use generated types: `Doc<'tableName'>`, `Id<'tableName'>`

## TanStack Router

### File Naming
- `index.tsx` - index routes
- `$param.tsx` - dynamic segments
- `$.tsx` - splat/catch-all
- `_layout.tsx` - pathless layouts
- `-file.tsx` - excluded from routing

## Hooks

One file per hook in `src/hooks/`.

## Library Utilities

`src/lib/` contains shared utilities that aren't hooks or components. Everything must be:
- Validated with Zod
- Performant
- Well-written and readable

## Generated Files

- `.config/rules.md` is the source of truth for AI assistant rules
- `AGENTS.md` is auto-generated from `rules.md` on file change — never edit it directly, never run the generator manually

## Making Changes

- When removing code, review the surrounding context for leftover artifacts (dead variables, unnecessary wrappers, orphaned blank lines)
- Clean up the full impact of every change, not just the literal lines requested
- Don't hardcode conventions that can be inferred from existing code — read the target file and match its patterns

## Rule Conflicts

CRITICAL rules are non-negotiable. If a rule seems wrong for a specific case, discuss with the user. Document any exceptions with a comment.

