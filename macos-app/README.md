# Local Workbench macOS App

`macos-app/` is a self-contained macOS-native desktop shell built with Electrobun and a locally spawned `code-server` backend. The shell stays thin: native windowing, native menus, native open dialogs, recent-workspace persistence, backend supervision, and macOS environment capture. The editor, terminal, filesystem access, search, settings, and extension host all come from the local backend.

## What it does

- Starts a native macOS window through Electrobun.
- Spawns `code-server` as a child process bound only to `127.0.0.1` on a random free port.
- Stores shell state, backend data, backend config snapshots, extensions, and logs under `~/Library/Application Support/LocalWorkbench`.
- Captures the user’s login-shell environment before starting the backend so integrated terminals inherit a realistic PATH for Homebrew, `nvm`, `asdf`, and similar setups.
- Uses OpenVSX for extension installation.
- Uses `code-server`’s local session socket to make native `Open File`, `Open Folder`, and `Open Recent` act on the running workbench without rebuilding the editor UI.

## Prerequisites

- macOS 14 or newer
- Bun installed and on PATH
- Node.js 22 or newer
- Xcode Command Line Tools
- Network access during `bun install` so Electrobun and `code-server` can fetch their runtime assets

## Run

```bash
cd macos-app
bun install
bun run dev
```

Development behavior:

- Builds a dev app bundle and launches it as a native macOS app.
- Opens a native macOS window.
- If there is no safe last workspace, development mode defaults the initial folder to the parent repo root.
- Automatically prepares the embedded `code-server` runtime even when Bun has skipped package lifecycle scripts.
- Re-run `bun run dev` after shell or backend code changes. The current MVP does not use Electrobun's watch mode because it is unstable with this copied-runtime layout.
- Backend logging defaults to `info` even in development so the shell log does not capture verbose terminal-environment dumps. Set `LOCAL_WORKBENCH_CODE_SERVER_LOG_LEVEL=debug` only when you intentionally need backend debug logs.

## Build

```bash
cd macos-app
bun install
bun run build
```

This produces a stable `.app` bundle at:

```text
macos-app/build/stable-macos-<arch>/Local Workbench.app
```

Packaging behavior:

- The stable `.app` bundle is self-contained. The staged payload archive now includes `package.json` and `node_modules/code-server/...` inside the bundle.
- The dev bundle still uses a repo-local `node_modules` symlink for fast iteration.
- Electrobun generates tarball/DMG artifacts before this project injects the `code-server` runtime, so `bun run build` removes those stale `artifacts/stable-macos-*` files instead of leaving misleading outputs behind.

## Verify

```bash
cd macos-app
bun run verify
```

That runs the prerequisite check and TypeScript typecheck. It does not launch the GUI in headless environments.

## Native menu

Implemented menu items:

- `New Window`
- `Open File`
- `Open Folder`
- `Open Recent`
- `Reload`
- `Toggle DevTools`
- `Quit`

## Logs and state

Application Support root:

```text
~/Library/Application Support/LocalWorkbench
```

Important files:

- Shell log: `~/Library/Application Support/LocalWorkbench/logs/shell.log`
- Shell state: `~/Library/Application Support/LocalWorkbench/state.json`
- Backend config: `~/Library/Application Support/LocalWorkbench/code-server/config/config.yaml`
- Backend launch snapshot: `~/Library/Application Support/LocalWorkbench/code-server/config/launch.json`
- Backend user data: `~/Library/Application Support/LocalWorkbench/code-server/user-data`
- Backend extensions: `~/Library/Application Support/LocalWorkbench/code-server/extensions`

## Extension flow

The backend is pinned to OpenVSX explicitly through `EXTENSIONS_GALLERY`, so installs come from OpenVSX rather than the Microsoft Marketplace. Recommended smoke checks after first launch:

1. Install `esbenp.prettier-vscode`
2. Install `dbaeumer.vscode-eslint`
3. Install a theme such as `pkief.material-icon-theme` or `zhuangtongfa.Material-theme`
4. Open the Extensions view and confirm the install/update flow completes
5. Run the integrated terminal and confirm `brew`, `node`, `git`, and any shell-managed runtime you use are visible

Verified in this workspace against the live backend directories:

- `esbenp.prettier-vscode@12.3.0`
- `dbaeumer.vscode-eslint@3.0.24`
- `pkief.material-icon-theme@5.32.0`

## Related docs

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [STATUS.md](./STATUS.md)
- [KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md)
