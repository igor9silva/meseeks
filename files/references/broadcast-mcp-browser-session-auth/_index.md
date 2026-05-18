---
title: Broadcast MCP browser-session auth reference
tags: [tech, source:ticktick, ticktick-list:meseeks, ticktick-status:inbox, class:reference]
---

Tech reference for MCP servers that use existing browser sessions instead of separate API auth flows.

The useful idea: expose an MCP server from a web app, then connect to it from another app through `postMessage`. The agent can use the user's already-authenticated browser session, while the MCP transport handles JSON-RPC messages between the client window and the server window/iframe.

Reference repo: https://github.com/RhysSullivan/broadcast-mcp

## Implementation Notes

- `package/src/transport.ts` defines `PostMessageServerTransport` and `PostMessageClientTransport`.
- The server side expects to be opened by `window.opener` or embedded by `window.parent`.
- The client can open the MCP server as a window or hidden iframe.
- Messages are marked with a transport id and passed as `MCP_SERVER_READY`, `MCP_CLIENT_PING`, and `MCP_MESSAGE`.
- `client/lib/mcp-client.ts` treats `type: "web"` servers as `PostMessageClientTransport` instances and feeds them to `experimental_createMCPClient`.
- `keepWindowOpen` lets the client reuse an existing authenticated server window.

## Why It Matters

This is a concrete pattern for "MCP auth using the browser": do not make every integration invent OAuth/API-key plumbing first; let the user authenticate normally in the product UI, then let MCP use that live browser context.

For Meseeks, the interesting shape is a component/app that can register tools while preserving the user's existing session. The dangerous part is also obvious: origin checks, allowed origins, message schema validation, and user-visible authorization prompts need to be first-class before we trust this with real user accounts.

## Source

- Tweet: https://x.com/rhyssullivan/status/1923956444153643443
- Posted: `2025-05-18T04:18:56.000Z`
- Author: [@RhysSullivan](https://x.com/RhysSullivan)
- Framing: MCP auth can be avoided by letting agents use the web and existing browser sessions.
- Engagement at scrape time: 484 likes, 34 reposts, 30 replies, 15 quotes, 435 bookmarks, 157,225 views.
- Code: https://github.com/RhysSullivan/broadcast-mcp/blob/main/package/src/transport.ts
- Client integration: https://github.com/RhysSullivan/broadcast-mcp/blob/main/client/lib/mcp-client.ts

## TickTick source

- Project: `🧞‍♂Meseeks (66b35a9a617f11216a574648)`
- List tag: `ticktick-list:meseeks`
- Task id: `68297be495d3911fb5ac6e12`
- Column: `Inbox (66b9091be0871102361203fc)`
- Status tag: `ticktick-status:inbox`
- Priority: `0`
- Created: `2025-05-18T06:19:16Z`
- Updated: `2025-05-18T08:41:07Z`
- Sort order: `-9222217210582901000`
