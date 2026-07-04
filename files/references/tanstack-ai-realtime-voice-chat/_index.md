---
title: "TanStack AI realtime voice chat"
tags: [class:reference, tech, ux]
---

[Talk to Your AI: Realtime Voice Chat in TanStack AI](https://tanstack.com/blog/tanstack-ai-realtime-voice-chat), by Alem Tuzlak, published March 12, 2026.

How to build realtime voice chat with TanStack AI, including browser audio streaming, provider adapters, transcripts, interruptions, multimodal input, client-side tools, and audio waveform/level visualization.

Useful implementation notes:

- Architecture: keep provider API keys on the server, generate short-lived realtime tokens with `realtimeToken()`, then let the browser connect directly to the provider through an adapter.
- Providers: OpenAI Realtime uses WebRTC; ElevenLabs uses WebSocket. The app-level client code can stay provider-agnostic through adapters.
- React entrypoint: `useRealtimeChat()` manages connection state, audio capture/playback, transcripts, tools, VAD, messages, and visualization data.
- Main states: `status` covers connection lifecycle; `mode` covers conversation lifecycle with `idle`, `listening`, `thinking`, and `speaking`.
- Voice controls: `connect`, `disconnect`, `startListening`, `stopListening`, and `interrupt`.
- VAD modes: server-side detection, OpenAI semantic VAD, or manual push-to-talk with `autoCapture: false`.
- Tools: TanStack AI `toolDefinition()` can run client-side via `.client()`, so realtime voice agents can call browser-local tools and continue the spoken conversation.
- Multimodal input: `sendText()` supports text fallback, and `sendImage()` supports image input for OpenAI realtime sessions.
- Transcripts: `pendingUserTranscript` and `pendingAssistantTranscript` stream while speech is happening; final messages land as typed parts in `messages`.
- Interruptions: users can interrupt speech by talking or calling `interrupt()`, and interrupted messages are marked in the message state.
- Runtime provider switching: choose an OpenAI or ElevenLabs adapter based on user selection, and have the server token endpoint issue the matching provider token.
- Non-React usage: `RealtimeClient` from `@tanstack/ai-client` exposes the lower-level client for other frameworks.

Audio visualization APIs:

- `inputLevel` and `outputLevel` are normalized `0-1` values suitable for volume bars.
- `getInputFrequencyData()` and `getOutputFrequencyData()` expose FFT frequency bins.
- `getInputTimeDomainData()` and `getOutputTimeDomainData()` expose waveform samples.
- For waveform rendering, call the raw data getter inside a `requestAnimationFrame` canvas loop and draw the waveform from the `Uint8Array` values.

Useful packages from the article:

```sh
pnpm add @tanstack/ai @tanstack/ai-client @tanstack/ai-react
pnpm add @tanstack/ai-openai
pnpm add @tanstack/ai-elevenlabs
```

Source: https://tanstack.com/blog/tanstack-ai-realtime-voice-chat
