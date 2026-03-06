# Electrobun Codex Client Prototype (macOS)

This is a macOS-first prototype that implements the Codex client integration in an **App Server-first** shape:

- spawn `codex app-server --transport stdio` in the main process
- speak JSON-RPC over stdio with typed request/response validation
- stream run events into a renderer-facing view model
- handle command/file approvals and explicit error recovery state

## Run locally

```bash
cd prototypes/electrobun-codex-client
bun install
bun run dev
```

## What is implemented

### app shell split
- `src/main/*`: process lifecycle, protocol client, orchestration
- `src/renderer/viewModel.ts`: renderer state updates for thread transcript/approvals/errors
- stable dev entrypoint: `bun run dev`

### app server lifecycle
- supervisor with spawn, restart budget + backoff, health gate, graceful shutdown (`SIGTERM` then `SIGKILL` fallback)

### typed protocol client
- wrappers for:
  - `thread.start`
  - `run.start`
  - `health.check`
  - `approval.command.respond`
  - `approval.file.respond`
- stream events validated with Zod discriminated union

### ux states (first pass)
- transcript streaming (`output.delta`)
- approval cards for command/file approvals
- run completion / failure handling
- reconnect/restart and stderr transport error capture

### bundling direction
- current code expects `codex` on PATH; for app artifact bundling, embed a fixed Codex runtime binary path and pass it into `AppServerSupervisorConfig.command`.

### fallback mode (api-only)
If App Server is unavailable, wire an alternate adapter that maps the same `submitPrompt` surface to the Responses API.

Scope delta vs App Server mode:
- no command/file approval handshake over stdio
- reduced event fidelity (depends on Responses streaming events)
- no local-tool process lifecycle to supervise
