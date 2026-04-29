# Known Limitations

## Security

- Authentication is currently `none`. The MVP relies on localhost-only binding plus a random port, not a full auth handoff or connection token.
- Any local process running as the same user could theoretically talk to the backend while it is active.

## Packaging

- The stable bundle copies the full runtime into the packaged payload and repacks Electrobun’s archive, so `bun run build` is relatively heavy and size-inefficient.
- The packaging path is scaffolded for macOS builds, but code signing and notarization are not configured.
- `bun run dev` is a build-and-launch flow, not live rebuild/hot reload. Electrobun's current watch mode was unstable with this copied `code-server` runtime layout.
- The dev bundle still stages a repo-local `node_modules` symlink for speed, so only the stable bundle should be treated as relocatable.
- Electrobun’s own tarball/DMG artifacts are generated before runtime injection. This project removes those stale stable artifacts rather than shipping misleading package files.

## Backend topology

- One backend process is shared across the app instance. Multiple native windows can attach to it, but the app does not yet provide a separate backend per window/workspace.
- Because file and folder opening reuse `code-server`’s own existing-instance IPC, exact focus routing across many simultaneous windows depends on backend session behavior.

## Workspace/session fidelity

- Safe automatic reopen only restores folders and `.code-workspace` files. Plain file targets are kept in recents but are not auto-restored as the last startup target.
- The shell persists recent targets itself, while `code-server` also has its own last-opened behavior internally. The shell intentionally stays in control of native recent menus.

## Extension compatibility

- OpenVSX is used instead of the Microsoft Marketplace, so marketplace-specific extensions and some licensing-dependent features may be unavailable.
- Browser/workbench-compatible extensions generally work best. Some extensions that assume Electron desktop APIs will still fail or degrade.

## Desktop parity

- This is not desktop VS Code, and it does not try to fake Electron APIs.
- Features tied specifically to upstream desktop Electron integrations may be absent even when the main workbench works well.

## Testing gap in this workspace

- Extension installation through the actual Extensions sidebar UI was not executed here, even though the live backend install path was verified.
- Integrated terminal creation and environment inheritance were verified, but terminal command output was not captured cleanly enough from the rendered UI to count as a separate UX validation step.
