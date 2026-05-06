# Status

## Implemented

- Self-contained `apps/macos-app/` package with its own `package.json`
- Electrobun shell entrypoint in `src/bun/index.ts`
- Native loading screen and failure diagnostics
- Native menu wiring for:
	- New Window
	- Open File
	- Open Folder
	- Open Recent
	- Reload
	- Toggle DevTools
	- Quit
- Window frame/fullscreen/maximized persistence
- Recent targets persistence
- Safe last-workspace restore
- Local `code-server` backend supervision
- Localhost-only binding with random port allocation
- `/healthz` readiness polling
- Session-socket open flow for file/folder reuse in the running backend
- Login-shell environment capture and probe logging
- OpenVSX gallery pinning
- App Support isolation for logs/state/backend data/extensions
- Development and build scripts

## Verified in this workspace

- Repository isolation: all changes are under `apps/macos-app/`
- Static structure and TypeScript sources are in place
- Electrobun API usage was written against the current published `electrobun@1.15.1` typings
- Backend strategy and options were written against the current published `code-server@4.110.1` package and source
- `bun run verify` passes
- `bun run dev` launches a native Electrobun app window and reaches the local workbench
- `bun run build:dev` completes and produces a working development app bundle
- `bun run build` completes and produces a working stable `.app` bundle under `build/stable-macos-arm64/Local Workbench.app`
- The backend binds only to `127.0.0.1` on a random port and reaches `/healthz`
- Native `Open Folder...` and `Open Recent` menu flows were exercised through macOS accessibility automation
- Recent targets and last workspace persist correctly across quit/relaunch
- The integrated terminal creates a real local `ptyHost` process
- The `ptyHost` environment includes Homebrew and `nvm` paths, and shell-environment probes resolved `brew`, `node`, `git`, and `bun`
- OpenVSX-backed extensions were installed against the live backend directories:
	- `esbenp.prettier-vscode@12.3.0`
	- `dbaeumer.vscode-eslint@3.0.24`
	- `pkief.material-icon-theme@5.32.0`
- Graceful app quit triggers `backend.shutdown` and an expected backend exit instead of `backend.unexpected-exit`

## Still not fully exercised here

- I did not click through extension installs in the actual Extensions sidebar UI; verification used the live backend and extension directories directly.
- I verified terminal creation and environment inheritance, but I did not capture terminal command output from the rendered UI reliably enough to call that separately proven.
- Code signing, notarization, and distribution packaging were not configured.

## Recommended first local smoke test

1. Run `cd apps/macos-app && bun install && bun run dev`
2. Confirm a native window opens and the loading screen transitions into the workbench
3. Use `Open Folder` on the parent repo
4. Open the integrated terminal and run:
	- `which brew`
	- `which node`
	- `which git`
	- `echo $PATH`
5. Install these from the Extensions view:
	- `esbenp.prettier-vscode`
	- `dbaeumer.vscode-eslint`
	- one theme extension
6. Quit and relaunch to confirm recent-workspace restore
