# browser-poc

Electron + React + TanStack Router/Query proof-of-concept browser that intercepts HTTP(S) traffic in the main process, preprocesses HTML through a mock AI layer, caches responses, and renders tabs via `WebContentsView`.

## Run

```bash
bun i
bun run dev
```

## Key flows

- Local pages: `app://local/welcome.html` are served from `src/static` using a custom protocol.
- External pages: `http(s)` traffic is intercepted through `protocol.interceptBufferProtocol`, transformed by `processWithAI`, and cached.
- Tabs: local app routes and web tabs share one tab strip with IPC-driven state.

## Project policies

- Bun-only package management (`bun.lockb` is the lockfile, `package-lock.json` is not allowed).
- Logging policy: `console.error` for fatal paths, `console.warn` for non-breaking issues, `console.info` for important lifecycle traces, `console.debug` for debugging.
- Environment variables are read through typed schemas (`src/main/schemas/envSchema.ts`) instead of direct `process.env` usage across the codebase.

Wow, this repo is now Bun-first and stricter at runtime boundaries.
