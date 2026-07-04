---
title: "Storage SDK"
tags: [class:reference, tech]
---

[Storage SDK](https://storagesdk.dev/) is a multi-provider TypeScript SDK for object storage with one portable API across storage backends.

Same concept family as [Files SDK](../files-sdk/_index.md): normalize storage operations so app/agent code does not care whether the backing store is S3-compatible storage, R2, GCS, Vercel Blob, MinIO, GitHub, Supabase, a local filesystem, or another adapter.

The thing that makes Storage SDK especially relevant for Meseeks/Reactor is that snapshots and forks are first-class primitives. Forks are writable storage sandboxes for agent runs; snapshots freeze a reproducible state so multiple agents can branch, mutate, compare, merge, or throw away work without touching the parent bucket.

Useful details:

- Install: `@storagesdk/core` plus `@storagesdk/adapters`.
- Core API: `upload`, `download`, `head`, `list`, `copy`, `move`, `delete`, `url`, and `uploadUrl`.
- I/O shape: uploads accept strings, bytes, blobs, array buffers, and web streams; downloads can return full items, streams, text, bytes, blobs, or JSON.
- Runtime behavior: every I/O method accepts `AbortSignal`; errors use typed `StorageError` codes.
- Provider switching: direct adapter imports for static selection, or `buildAdapter()` / `ADAPTERS` / `getAdapterEnvVars()` for runtime selection.
- Snapshots/forks: native on Tigris and GitHub; emulated elsewhere with sibling buckets/containers/folders and metadata.
- Agent integrations: exposes tools for Vercel AI SDK and Mastra, plus an MCP server.
- CLI: `@storagesdk/cli` gives shell-style commands like `ls`, `stat`, `cat`, `cp`, `mv`, `rm`, and `sign`; remote paths use a `storage://` scheme.
- Escape hatch: `storage.raw` exposes the typed native client when adapter-specific features are needed.

Why it matters here: this is a concrete library-shaped version of a provider-neutral VFS/storage layer with branchable state, which maps cleanly to agent workspaces, reproducible runs, and "try changes in a fork" behavior.

## Related

- [Files SDK](../files-sdk/_index.md): similar unified storage SDK concept; useful comparison point for provider coverage, agent SDK tools, and whether snapshots/forks matter.

## Source

- Site: https://storagesdk.dev/
- Quickstart: https://storagesdk.dev/get-started/
- API: https://storagesdk.dev/api/
- Adapters: https://storagesdk.dev/adapters/
- AI integrations: https://storagesdk.dev/ai/
- CLI: https://storagesdk.dev/cli/
