# Architecture

## Overview

This app uses a thin-native-shell / thick-local-backend model:

- Native shell: Electrobun on macOS
- Renderer: system webview through Electrobun’s native renderer
- Backend: local `code-server` child process
- Scope: localhost-only, single-machine desktop use

The shell owns process lifecycle, window state, menus, and workspace selection. The backend owns the actual editor workbench, local terminal, filesystem access, search, settings, and extension host.

## Why this approach

This deliberately avoids three dead ends:

1. Porting upstream desktop VS Code
2. Building an Electron compatibility shim
3. Reimplementing terminal and extension hosting in a thin browser wrapper

`code-server` already provides the workbench model this app needs, including local terminal support and broad extension compatibility through the existing extension host architecture. The shortest viable path is to embed that backend locally and keep the shell narrow.

## Runtime components

### 1. Electrobun shell

Files:

- `src/main.ts`
- `src/ui/screens.ts`
- `src/services/*`

Responsibilities:

- Create native windows
- Show a loading screen before the backend is healthy
- Load the localhost workbench URL into the webview
- Persist window size/position/fullscreen/maximized state
- Manage native menus and dialogs
- Persist recent workspaces
- Surface readable failure diagnostics in-window

### 2. Backend supervisor

Files:

- `backend/supervisor.ts`
- `backend/environment.ts`
- `backend/health.ts`
- `backend/ports.ts`
- `backend/sessionSocket.ts`

Responsibilities:

- Capture login-shell environment
- Pick a random localhost port
- Spawn `code-server`
- Keep it bound to `127.0.0.1`
- Wait for `/healthz`
- Forward backend output into structured logs
- Expose a session-socket helper for opening files/folders in the running instance
- Kill the backend on app shutdown

### 3. Persistent storage

Location:

- `~/Library/Application Support/LocalWorkbench`

Stored data:

- `state.json` for shell state
- `logs/shell.log` for structured shell/backend logs
- `code-server/config/config.yaml` for the backend config file
- `code-server/user-data` for backend user state
- `code-server/extensions` for OpenVSX-installed extensions
- `code-server/config/launch.json` for the current launch snapshot

## Open flow

### Initial app launch

1. Shell boots and creates a loading window.
2. Shell captures the login-shell environment with the user’s default shell in login+interactive mode.
3. Shell chooses a random free port and spawns `code-server`.
4. Shell polls `http://127.0.0.1:<port>/healthz`.
5. Once healthy, the window loads the local workbench URL.

### Open Folder / Open Workspace

1. Native dialog returns a local path.
2. Shell records it in recent targets.
3. Shell loads `/?folder=<path>` or `/?workspace=<path>` in the active native window.

### Open File

1. Native dialog returns a local file path.
2. Shell records it in recent targets.
3. If the workbench is already loaded, the shell sends an `open` request over `code-server`’s session socket.
4. If the window is still booting, the shell loads the base workbench first and replays the file open request after `dom-ready`.

This uses the same local IPC route that `code-server`’s own CLI uses to open resources in an existing instance, which is much more reliable than trying to invent custom query parameters.

## Terminal environment

macOS GUI apps often miss shell-initialized developer PATH state. To avoid a broken integrated terminal:

1. The shell starts the user’s default shell with `-ilc`.
2. That shell runs `node -p 'JSON.stringify(process.env)'`.
3. The shell parses the captured environment and merges it into the backend process environment.
4. The backend therefore launches terminals with the same PATH/Homebrew/runtime manager context that the login shell exposed.

The capture step also probes common developer tools such as `brew`, `node`, `git`, and `bun`, and logs the resolved paths for diagnostics.

## Extension strategy

- Marketplace source: OpenVSX
- Mechanism: `EXTENSIONS_GALLERY` is set explicitly to OpenVSX endpoints
- Runtime: installation happens through the backend’s built-in extension management flow

This keeps extension compatibility as close as possible to a normal browser-based VS Code deployment while staying honest about desktop gaps.

## Security posture

Current MVP security choices:

- Bind only to `127.0.0.1`
- Use a random port each launch
- Keep the backend process local and shell-owned
- Do not expose it externally
- Do not implement a full auth handoff yet

The current shell intentionally leaves room for a future connection token or stronger session gating layer, but the MVP relies on localhost binding plus random port selection.

## Window model

This MVP uses one local backend process per app instance and allows multiple native windows to point at it. That keeps the implementation small and avoids duplicating backend processes per window. The tradeoff is that some “open in existing instance” behavior is mediated by the backend’s own session routing rather than by a shell-managed multi-backend topology.
