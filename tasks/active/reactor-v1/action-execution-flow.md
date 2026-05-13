---
title: Action Execution Flows
priority: low
tags: [reactor]
---

# Action Execution Flows (UI -> Backend)

This file is flow-only: UI entry points, data flow, and backend execution paths as they exist today.

This is a Reactor v1 source reference. It describes the current/v0 implementation and may be stale as the new Reactor replaces the old path.

## UI Composer -> act() (existing task)

Key files:
- `src/components/ActionComposer/ActionComposer.tsx`
- `src/hooks/useComposer.tsx`
- `src/hooks/useAct.ts`
- `convex/action/public.ts`
- `convex/action/private.ts`
- `convex/action/lifecycle/private.ts`

### Composer submission flow

```mermaid
flowchart TD
    UI[ActionComposer] -->|Cmd+Enter or send| C[useComposer.submit]
    C --> BF[buildFinalSkills]
    BF --> ACT[useAct.act -> api.action.public.act]
    ACT --> A1[action.public.act]
    A1 --> A2[action.private._addMany]
    A2 --> R1[action.lifecycle._runNextActionIfNeeded]
    R1 --> R2[action.lifecycle._runAction]
    R2 --> R3[action.lifecycle._perform]
    R3 --> R4[action.lifecycle._resolve]
    R4 --> A2
```

### Skill list construction (current ordering)

`useComposer.buildFinalSkills` (`src/hooks/useComposer.tsx`)
1) Budget skills first: `increaseBudget`, `decreaseBudget`
2) Other queued skills
3) `say` from message (if present)
4) If empty and task not acting: `requestIteration`

```mermaid
flowchart TD
    Q[queue + message] --> B[filter budget skills]
    B --> O[other queued skills]
    O --> S[append say if message]
    S --> D[append requestIteration if empty and not acting]
```

### Enqueue-only flow (Alt+Enter)

```mermaid
sequenceDiagram
    participant UI as ActionComposer
    participant UC as useComposer.enqueue
    participant DS as useDraftSync.save

    UI->>UC: enqueue({ skillKey: "say", args })
    UC->>DS: save(queue, message)
    UC-->>UI: queue updated (no backend action yet)
```

## Draft sync (Composer)

Key files:
- `src/hooks/useDraftSync.ts`
- `convex/drafts/public.ts`
- `convex/drafts/private.ts`

```mermaid
sequenceDiagram
    participant UI as useComposer
    participant DS as useDraftSync
    participant DQ as drafts.public.findOne
    participant DM as drafts.public.save/clear

    UI->>DS: init(taskId)
    DS->>DQ: query server draft
    DQ-->>DS: draft | null
    DS-->>UI: onServerDraftReceived(draft)
    UI->>DS: save(queue, message) [debounced]
    DS->>DM: save or clear
```

## New task creation -> initial actions

Key files:
- `src/hooks/useTaskMutations.ts` (useAddTask)
- `convex/tasks/public.ts` (add)
- `convex/tasks/private.ts` (_add)
- `convex/action/private.ts` (_addMany)

```mermaid
flowchart TD
    UI[useAddTask] --> T1[tasks.public.add]
    T1 --> T2[tasks.private._add]
    T2 --> T3[insert task]
    T2 --> T4[action.private._addMany]
    T4 --> R1[action.lifecycle._runNextActionIfNeeded]
```

## Stop acting (Ctrl+C)

Key files:
- `src/components/ActionComposer/ActionComposer.tsx`
- `src/hooks/useTaskMutations.ts` (useStop)
- `convex/action/public.ts` (act)
- `convex/action/private.ts` (_addMany, _stop)

```mermaid
flowchart TD
    UI[ActionComposer.handleStop] --> ST[useStop -> api.action.public.act]
    ST --> A1[action.public.act]
    A1 --> A2[action.private._addMany]
    A2 --> R1[action.lifecycle._runNextActionIfNeeded]
    R1 --> R2[action.lifecycle._runAction]
    R2 --> R3[action.lifecycle._perform]
```

## Approve / Reject pending authorization

Key files:
- `src/hooks/useTaskMutations.ts` (useApproveAction, useRejectAction)
- `convex/action/public.ts` (authorize)
- `convex/action/private.ts` (_authorize)
- `convex/action/lifecycle/private.ts` (_runNextActionIfNeeded)

```mermaid
flowchart TD
    UI[approve/reject] --> AU[action.public.authorize]
    AU --> PR[action.private._authorize]
    PR --> RN[action.lifecycle._runNextActionIfNeeded]
```

## Backend execution path (common continuation)

Key files:
- `convex/action/lifecycle/private.ts`
- `convex/skills/tools.ts`
- `convex/skills/createBuiltInTool.ts`
- `convex/skills/createHttpTool.ts`
- `convex/skills/createAITool.ts`

```mermaid
flowchart TD
    START[_runNextActionIfNeeded] -->|no running/pending auth| RUN[_runAction]
    RUN --> ST[_start: action running, task acting]
    ST --> PERF[_perform]
    PERF --> CT[createTool]
    CT --> EX[tool.execute]
    EX --> RES[_resolve -> patch action result]
    RES --> REACT[_addMany reactions]
    REACT --> START
```

## Soft skill tool call flow (LLM)

Key files:
- `convex/skills/createAITool.ts`
- `convex/magicRock.tsx`

```mermaid
sequenceDiagram
    participant P as _perform
    participant CT as createAITool.execute
    participant MR as _prepareContext
    participant AI as _askMagicRock
    participant RS as _resolve

    P->>MR: build context (history + tools + instructions)
    P->>CT: execute soft skill
    CT->>AI: generateText
    AI-->>CT: toolCalls + text + finishReason
    CT-->>P: result.reactions (first toolCall only)
    P->>RS: persist + enqueue reactions
```
