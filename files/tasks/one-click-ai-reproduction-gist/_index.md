---
title: One-click AI reproduction gist
priority: low
tags: [source:ticktick, ticktick-list:meseeks, ticktick-status:inbox, status:backlog, class:task, ux]
---

Add a button to the existing DevMode that generates a gist reproducing the exact AI scenario with the AI SDK.

The goal is to debug and share reproducible issues with providers. The generated gist should include the model/provider setup, relevant tools, required schema shape, prompt/context needed to trigger the issue, and a tiny runnable script.

Reference gist: [Reproduction of Kimi 2 error on Groq](https://gist.github.com/igor9silva/821fd724fcf0ede05f15545f3d55f9d1)

The reference gist is a `break.ts` reproduction using `@ai-sdk/groq`, `generateText`, `tool`, and `zod`, with a fake API key placeholder, a Groq Kimi model, representative Meseeks-like tool definitions, `toolChoice: "required"`, and `maxSteps: 1`.
