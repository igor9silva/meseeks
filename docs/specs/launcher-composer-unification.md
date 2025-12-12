# Launcher + Composer Unification Specification

> **Implementation Status**: Phase 1 completed. Core shortcut unification and Launcher modes are implemented.

## Overview

This specification outlines the unification of the Launcher (`CommandMenu`) and Composer (`ActionComposer`/`QuickSeek`) experiences, with aligned keyboard shortcuts centered around `Cmd+I`.

## Current State

| Shortcut | Current Behavior |
|----------|-----------------|
| `Cmd+K` | Opens CommandMenu (Launcher) |
| `Cmd+J` | Navigates to `/new` route → renders `QuickSeek` (standalone Composer) |
| `Cmd+I` | Focuses ActionComposer textarea (only works when ActionComposer is visible) |

### Current Components

1. **CommandMenu** (`src/components/CommandMenu.tsx`)
   - Dialog-based launcher with search/navigation
   - Quick actions (resolve, discard, budget, etc.)
   - Task list navigation
   - Global shortcuts navigation

2. **ActionComposer** (`src/components/ActionComposer/`)
   - In-task composer for running actions
   - Requires existing `task` prop
   - Voice recording, intelligence selector, keyboard shortcuts

3. **QuickSeek** (`src/components/QuickSeek.tsx`)
   - Standalone "new task" composer
   - Budget selector + intelligence selector
   - Creates task then navigates to it

---

## Desired State

### Keyboard Shortcuts

| Shortcut | New Behavior |
|----------|-------------|
| `Cmd+K` | Opens Launcher (unchanged) |
| `Cmd+I` | **Unified**: If Composer visible → focus it. If not → open Launcher in Composer mode |
| `Tab` (in empty Launcher) | Switch Launcher to Composer mode |
| `Escape` (in Composer mode) | Back out to Launcher search mode (stay in Launcher) |
| `Cmd+I` repeated (in Composer) | Rotate through Quick Actions |

### Launcher Modes

The Launcher becomes a multi-modal overlay with two primary modes:

```
┌─────────────────────────────────────┐
│  [Search/Composer Input]            │
├─────────────────────────────────────┤
│  [Context Strip - when applicable]  │  ← shows task context, skill indicator
├─────────────────────────────────────┤
│  [Results / Composer Controls]      │
└─────────────────────────────────────┘
```

#### Mode 1: Search Mode (current Launcher behavior)
- Search tasks, navigate, run quick actions
- `Tab` switches to Composer mode (when input is empty)

#### Mode 2: Composer Mode
- Full Composer functionality (what QuickSeek does today)
- Context attachment strip shows current task (if any)
- Skill indicator (not "mode") - shows which skill will run
- `Escape` returns to Search mode

---

## Context Attachment Strip

When opening Composer mode from within a task context (even if no Composer is currently visible), display a context strip:

```
┌─────────────────────────────────────────────────────┐
│ 📎 Task: "Analyze Q4 metrics"  │ $0.45 remaining    │
│ ──────────────────────────────────────────────────  │
│ [Composer input here...]                            │
│                                                     │
│ [Intelligence] [Skills] ─────── [⌘⏎ to act]        │
└─────────────────────────────────────────────────────┘
```

**Context Strip Contents:**
- Task title (truncated)
- Budget/energy indicator
- Possibly: relevant shortcuts, status indicator

**When visible:**
- Opening Composer via `Cmd+I` while inside a task (even if navigated deep into attachments)
- Creating a follow-up from a completed task

**When hidden:**
- Global context (no task) - implies "new task" target
- Could show a subtle "New task" indicator instead

---

## Skill Indicator (vs "Mode")

The Composer should show which skill will run, not a "mode" concept:

- Default skill: `say` (current behavior)
- Future: skill selector dropdown (like Cursor's bottom-left indicator)
- Skills are actions; conceptually "which skill you're running"

**Placement:** Bottom-left of Composer, similar to current `IntelligenceSelector`

---

## Quick Actions Rotation (`Cmd+I` repeated)

When focused in Composer, pressing `Cmd+I` again rotates through Quick Actions:

```
1st Cmd+I → focus Composer
2nd Cmd+I → Quick Action 1 (e.g., "iterate" with no args)
3rd Cmd+I → Quick Action 2 (e.g., "schedule" with placeholder)
4th Cmd+I → back to default Composer
```

**Quick Actions are:**
- Skills with pre-filled or placeholder args
- User-configurable (future)
- Context-aware (different for active vs resolved tasks)

---

## Task Creation Flow

### Current Flow
```
User types in QuickSeek → submits → 
  1. tasks.public.add() creates task with message & budget
  2. Internally runs increaseBudget + say actions
  3. Navigates to /task/{id}
```

### Proposed Flow

**Option A: Keep Separate APIs (recommended for v0)**
- Keep `tasks.public.add()` as-is
- Composer targets existing task or creates new one before acting

**Option B: Unified "Act" API (future)**
```typescript
// action.public.act now handles optional taskId
act({
  taskId?: Id<'tasks'>,  // optional - if missing, creates task first
  skillKey: string,
  args: Record<string, any>,
  initialFunds?: bigint, // for new tasks
  // ...
})
// Returns: { taskId, actionId }
```

**Recommendation:** Start with Option A. The Composer determines whether to:
1. Act on existing task (has `taskId` in context)
2. Create new task then act (no `taskId`)

The UI should make this transparent - user doesn't need to know if task exists yet.

---

## Implementation Plan

### Phase 1: Unify Shortcuts & Launcher Modes

1. **Create Launcher Context Provider**
   - Track mode: `'search' | 'composer'`
   - Track context: `{ taskId?: Id<'tasks'>, task?: Doc<'tasks'> }`
   - Expose: `openSearch()`, `openComposer(context?)`, `close()`

2. **Modify CommandMenu**
   - Add mode state
   - Render Composer UI when in composer mode
   - Handle `Tab` to switch modes
   - Handle `Escape` to go back to search (not close)

3. **Update Keyboard Shortcuts**
   - Remove `Cmd+J` shortcut
   - Update `Cmd+I` to check for visible Composer first
   - If no visible Composer → open Launcher in Composer mode with current context

4. **Detect "Composer Visible"**
   - Create a Composer visibility context/hook
   - ActionComposer registers itself when mounted
   - `Cmd+I` handler checks this context

### Phase 2: Context Attachment Strip

1. **Create ContextStrip Component**
   - Receives task context
   - Displays: task title, budget, status
   - Compact, single-line design

2. **Integrate into Launcher Composer Mode**
   - Show when `context.taskId` is present
   - Hide or show "New task" when no context

### Phase 3: Skill Indicator & Selection

1. **Add Skill Selector to Composer**
   - Default: `say`
   - Future: dropdown to select other skills
   - Position: bottom-left, similar to intelligence selector

2. **Prepare for Multi-Skill Composer**
   - Skill determines input UI (some skills need structured args)
   - `say` is just text input
   - Others might need different inputs

### Phase 4: Quick Actions Rotation

1. **Define Quick Actions**
   - Array of `{ skillKey, args?, label }` for current context
   - Context-aware: different for active vs resolved tasks

2. **Implement Rotation**
   - Track current quick action index
   - `Cmd+I` when focused increments index
   - Visually indicate current quick action

### Phase 5: Task Auto-Creation (Backend)

1. **Option A Flow (frontend handles)**
   - Composer checks if `taskId` exists
   - If not, calls `tasks.public.add()` first, then `act()`
   - Return to user: unified experience

2. **Option B (future backend enhancement)**
   - Modify `act()` to accept optional `taskId`
   - If missing, create empty task first
   - Return both `taskId` and `actionId`

---

## Budget Integration (Future Consideration)

**Current:** Budget is managed via explicit `increaseBudget`/`decreaseBudget` actions.

**Vision:** Actions can include budget adjustment as part of their execution.

**Possible Approaches:**

1. **Budget as Action Arg**
   ```typescript
   act({
     taskId,
     skillKey: 'say',
     args: { message: '...' },
     addBudget: 0.5, // optional
   })
   ```

2. **Budget in Composer UI**
   - Show remaining budget near Composer
   - Quick "add energy" button inline
   - Slider/input for precise amounts

3. **Native Budget on Any Action**
   - Modify action schema to include optional budget delta
   - Applied atomically with action

**Recommendation:** Keep current approach for v0. The Composer already has `BudgetSelector` in QuickSeek for new tasks. For existing tasks, budget management stays separate (via quick actions or header).

---

## Component Architecture (Proposed)

```
src/
├── components/
│   ├── Launcher/
│   │   ├── Launcher.tsx           # main overlay component
│   │   ├── LauncherProvider.tsx   # context provider (mode, context)
│   │   ├── LauncherSearch.tsx     # search mode UI (current CommandMenu guts)
│   │   ├── LauncherComposer.tsx   # composer mode UI
│   │   ├── ContextStrip.tsx       # task context attachment strip
│   │   ├── SkillIndicator.tsx     # skill selector/indicator
│   │   └── index.ts
│   ├── ActionComposer/
│   │   └── ...                    # keep for in-page composer
│   └── QuickSeek.tsx              # deprecate or redirect to Launcher
├── hooks/
│   ├── useLauncher.ts             # hook to access launcher context
│   └── useComposerVisibility.ts   # track if a Composer is visible
```

---

## Migration Path

1. **Phase 1:** Add Launcher modes + update shortcuts. QuickSeek still exists as fallback.
2. **Phase 2:** `/new` route renders Launcher in Composer mode (not QuickSeek).
3. **Phase 3:** Deprecate QuickSeek, all composer flows go through Launcher.
4. **Phase 4:** ActionComposer remains for in-page usage, registers with visibility context.

---

## Open Questions

1. **Should Launcher Composer create a task immediately on first keystroke?**
   - Pro: Enables auto-save, URL updates to `/task/{id}`
   - Con: Creates empty tasks if user abandons

2. **How should context transfer when navigating?**
   - If I'm in task A, open Composer, should it attach to A?
   - What if I'm browsing inbox but task A was last viewed?

3. **Mobile experience?**
   - Launcher might need different treatment (full-screen drawer)
   - Current QuickSeek works well on mobile

4. **Quick Actions persistence?**
   - User-configurable or system-defined?
   - Per-task or global?

---

## Summary

The core change is making `Cmd+I` the universal "compose" shortcut:
- **Visible Composer → focus it**
- **No visible Composer → open Launcher in Composer mode**

The Launcher becomes the central overlay for both search/navigation and composing, with smooth transitions between modes and proper context handling.

This unification simplifies the mental model: one shortcut to compose, one shortcut to search (`Cmd+K`), with `Tab` as a quick mode toggle inside the Launcher.

---

## Implementation Status

### ✅ Completed (Phase 1)

1. **LauncherProvider** (`src/hooks/useLauncher.tsx`)
   - Mode state: `'search' | 'composer'`
   - Task context management
   - `openSearch()`, `openComposer(context?)`, `close()`, `setMode()`

2. **ComposerVisibilityProvider** (`src/hooks/useComposerVisibility.tsx`)
   - Tracks whether a Composer is visible on the page
   - ActionComposer registers/unregisters on mount/unmount
   - `focusComposer()` for programmatic focus

3. **Unified `Cmd+I` Shortcut**
   - If Composer is visible → focuses it
   - If no Composer visible → opens Launcher in Composer mode with current task context
   - Removed duplicate shortcuts from ActionComposer and QuickSeek

4. **`Cmd+J` Removed**
   - No longer navigates to `/new` route
   - Replaced by `Cmd+I` opening Composer mode

5. **Launcher Search/Composer Modes**
   - `Tab` (when input empty) switches to Composer mode
   - `Escape` in Composer mode returns to Search mode
   - "Compose message" quick action in Search mode

6. **LauncherComposer Component** (`src/components/Launcher/LauncherComposer.tsx`)
   - Full Composer functionality (budget selector, intelligence, voice)
   - Works for new tasks or existing task context
   - Context-aware behavior

7. **ContextStrip Component** (`src/components/Launcher/ContextStrip.tsx`)
   - Shows task title and budget when attached to a task
   - Shows "New task" indicator when no context

### 🔮 Future Work (Phases 2-5)

- Quick Actions rotation (`Cmd+I` repeated cycles through actions)
- Skill indicator/selector (beyond "say")
- Task auto-creation in backend (`act()` without `taskId`)
- Budget integration into actions
- Mobile-specific Launcher experience
- Deprecate QuickSeek in favor of Launcher Composer mode
