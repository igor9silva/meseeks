# Electrobun Codex Client Prototype (macOS)

This prototype now runs as a real Electrobun desktop app window on macOS.

runtime behavior:
- opens a native Electrobun window
- hosts a local Bun API + WebSocket bridge on `127.0.0.1` (defaults to `48676`, then scans `48677+` when busy unless `CODEX_APP_API_PORT` is set)
- renderer UI drives thread start, prompt submit, and approval responses
- Codex runtime mode auto-selects:
  - `codex app-server --transport stdio` when available
  - `codex proto` fallback when `app-server` is not exposed by the installed CLI

## Run locally

```bash
cd prototypes/electrobun-codex-client
bun install
bun run dev
```

headless debug mode (no window):

```bash
bun run headless
```

## What is implemented

### app shell split
- `src/bun/index.ts`: Electrobun main process, API bridge, window bootstrap
- `src/main/*`: Codex process lifecycle, protocol client, orchestration
- `src/mainview/*`: renderer UI (thread, prompts, approvals, transcript, state panel)

### app server lifecycle
- supervisor with spawn, restart budget + backoff, health gate, graceful shutdown (`SIGTERM` then `SIGKILL` fallback)

### typed protocol client
- wrappers for:
  - `thread.start`
  - `run.start`
  - `health.check`
  - `approval.command.respond`
  - `approval.file.respond`
- stream events validated with Zod schemas for both JSON-RPC and proto envelopes

### ux states (first pass)
- runtime boot status + errors
- thread start form
- prompt submission
- transcript streaming (`output.delta`)
- command/file approval cards with approve/deny actions
- live state sync via WebSocket

### bundling direction
- current code expects `codex` on PATH; for app artifact bundling, embed a fixed Codex runtime binary path and pass it into `AppServerSupervisorConfig.command`.

### fallback mode (api-only)
If App Server is unavailable, wire an alternate adapter that maps the same `submitPrompt` surface to the Responses API.

Scope delta vs App Server mode:
- no command/file approval handshake over stdio
- reduced event fidelity (depends on Responses streaming events)
- no local-tool process lifecycle to supervise
