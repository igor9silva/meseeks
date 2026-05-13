import { useEffect, useState } from 'react'
import { Bug, Clock3, Globe, Plus, Settings2, X } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { useTabs } from '~/hooks/useTabs'
import { type TabSnapshot } from '../../../shared/schemas/ipcSchema'

const TAB_DRAG_MIME = 'application/x-browser-poc-tab'
const TAB_DRAG_PREFIX = 'browser-poc-tab:'

type TabDragPayload = {
  sourceWindowId: number
  sourceTabId: string
}

export function TabBar() {
  const {
    windowId,
    tabs,
    activeTab,
    activeTabId,
    switchTab,
    closeTab,
    createLocalTab,
    createWebTab,
    openTabDevTools,
    reorderTabs,
    detachTabToNewWindow,
    importDroppedTab
  } = useTabs()
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null)
  const [dropTargetTabId, setDropTargetTabId] = useState<string | null>(null)
  const isActiveWebTab = activeTab?.kind === 'web'
  const tabIds = tabs.map(tab => tab.id)

  const clearDragState = () => {
    setDraggedTabId(null)
    setDropTargetTabId(null)
  }

  const commitReorder = (sourceTabId: string, targetTabId?: string) => {
    if (sourceTabId.length === 0) return

    const reorderedTabIds = reorderTabIds(tabIds, sourceTabId, targetTabId)
    const didOrderChange = reorderedTabIds.some((tabId, index) => tabIds[index] !== tabId)
    if (!didOrderChange) {
      clearDragState()
      return
    }

    void reorderTabs(reorderedTabIds)
    clearDragState()
  }

  return (
    <div className="flex items-center gap-2 border-t border-border">
      <div
        className="flex flex-1 items-center gap-2 overflow-x-auto p-2"
        onDragOver={event => {
          const payload = parseTabDragPayload(event.dataTransfer)
          if (!payload) return
          event.preventDefault()

          if (payload.sourceWindowId !== windowId) return
          setDraggedTabId(payload.sourceTabId)
        }}
        onDrop={event => {
          const payload = parseTabDragPayload(event.dataTransfer)
          if (!payload) return
          event.preventDefault()

          if (payload.sourceWindowId === windowId) {
            commitReorder(payload.sourceTabId)
            return
          }

          void importDroppedTab(payload.sourceTabId)
          clearDragState()
        }}
      >
        {tabs.map(tab => {
          const isDropTarget = dropTargetTabId === tab.id && draggedTabId !== tab.id
          return (
            <button
              key={tab.id}
              draggable
              className={`group flex h-9 items-center gap-2 rounded-full border px-3 text-xs transition-colors ${activeTabId === tab.id ? 'border-primary/30 bg-primary/10 text-foreground' : 'border-border bg-card text-muted-foreground hover:bg-muted/50'} ${isDropTarget ? 'ring-2 ring-ring ring-offset-2 ring-offset-background' : ''}`}
              onClick={() => {
                void switchTab(tab.id)
              }}
              onMouseDown={event => {
                if (event.button !== 1) return
                event.preventDefault()
                event.stopPropagation()
                void closeTab(tab.id)
              }}
              onAuxClick={event => {
                if (event.button !== 1) return
                event.preventDefault()
                event.stopPropagation()
                void closeTab(tab.id)
              }}
              onDragStart={event => {
                event.dataTransfer.effectAllowed = 'move'
                setTabDragPayload(event.dataTransfer, { sourceWindowId: windowId, sourceTabId: tab.id })
                setDraggedTabId(tab.id)
                setDropTargetTabId(tab.id)
              }}
              onDragOver={event => {
                const payload = parseTabDragPayload(event.dataTransfer)
                if (!payload) return
                event.preventDefault()

                if (payload.sourceWindowId !== windowId) return
                if (payload.sourceTabId === tab.id) return
                setDraggedTabId(payload.sourceTabId)
                setDropTargetTabId(tab.id)
              }}
              onDrop={event => {
                const payload = parseTabDragPayload(event.dataTransfer)
                if (!payload) return
                event.preventDefault()

                if (payload.sourceWindowId === windowId) {
                  commitReorder(payload.sourceTabId, tab.id)
                  return
                }

                void importDroppedTab(payload.sourceTabId)
                clearDragState()
              }}
              onDragLeave={event => {
                if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                  setDropTargetTabId(null)
                }
              }}
              onDragEnd={event => {
                const dropEffect = event.dataTransfer.dropEffect
                if (dropEffect === 'none') {
                  void detachTabToNewWindow(tab.id)
                }
                clearDragState()
              }}
            >
              <TabIcon tab={tab} />
              <span className="max-w-52 truncate">{tab.title}</span>
              <span
                className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                role="button"
                tabIndex={0}
                onClick={event => {
                  event.stopPropagation()
                  void closeTab(tab.id)
                }}
                onKeyDown={event => {
                  if (event.key !== 'Enter' && event.key !== ' ') return
                  event.stopPropagation()
                  event.preventDefault()
                  void closeTab(tab.id)
                }}
              >
                <X className="h-3.5 w-3.5" />
              </span>
            </button>
          )
        })}
      </div>
      <div className="flex items-center gap-2 px-2">
        <Button
          variant="outline"
          size="icon"
          title="New Tab"
          onClick={() => {
            void createWebTab('https://igorsilva.com.br')
          }}
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          title="Inspect Current Tab"
          disabled={!activeTabId || !isActiveWebTab}
          onClick={() => {
            if (!activeTabId) return
            void openTabDevTools(activeTabId)
          }}
        >
          <Bug className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          title="Settings"
          onClick={() => {
            void createLocalTab({ route: '/settings', title: 'Settings' })
          }}
        >
          <Settings2 className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          title="History"
          onClick={() => {
            void createLocalTab({ route: '/history', title: 'History' })
          }}
        >
          <Clock3 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function TabIcon({ tab }: { tab: TabSnapshot['tabs'][number] }) {
  const [isImageValid, setIsImageValid] = useState(true)

  useEffect(() => {
    setIsImageValid(true)
  }, [tab.kind === 'web' ? tab.faviconUrl : null])

  if (tab.kind === 'web' && tab.faviconUrl && isImageValid) {
    return (
      <img
        src={tab.faviconUrl}
        alt=""
        className="h-4 w-4 rounded-sm"
        onError={() => {
          setIsImageValid(false)
        }}
      />
    )
  }

  return <Globe className="h-4 w-4 text-muted-foreground" />
}

function reorderTabIds(tabIds: string[], draggedTabId: string, targetTabId?: string) {
  const fromIndex = tabIds.indexOf(draggedTabId)
  if (fromIndex < 0) return tabIds

  const nextTabIds = tabIds.slice()
  nextTabIds.splice(fromIndex, 1)

  if (!targetTabId) {
    nextTabIds.push(draggedTabId)
    return nextTabIds
  }

  const rawTargetIndex = nextTabIds.indexOf(targetTabId)
  if (rawTargetIndex < 0) {
    nextTabIds.push(draggedTabId)
    return nextTabIds
  }

  nextTabIds.splice(rawTargetIndex, 0, draggedTabId)
  return nextTabIds
}

function setTabDragPayload(dataTransfer: DataTransfer, payload: TabDragPayload) {
  const serializedPayload = JSON.stringify(payload)
  dataTransfer.setData(TAB_DRAG_MIME, serializedPayload)
  dataTransfer.setData('text/plain', `${TAB_DRAG_PREFIX}${serializedPayload}`)
}

function parseTabDragPayload(dataTransfer: DataTransfer | null): TabDragPayload | null {
  if (!dataTransfer) return null

  const rawCustomPayload = dataTransfer.getData(TAB_DRAG_MIME)
  if (rawCustomPayload.trim().length > 0) {
    return parseTabDragPayloadString(rawCustomPayload)
  }

  const rawTextPayload = dataTransfer.getData('text/plain')
  if (!rawTextPayload.startsWith(TAB_DRAG_PREFIX)) return null
  return parseTabDragPayloadString(rawTextPayload.slice(TAB_DRAG_PREFIX.length))
}

function parseTabDragPayloadString(value: string): TabDragPayload | null {
  try {
    const parsed = JSON.parse(value) as { sourceWindowId?: unknown; sourceTabId?: unknown }
    if (typeof parsed.sourceWindowId !== 'number') return null
    if (!Number.isInteger(parsed.sourceWindowId)) return null
    if (typeof parsed.sourceTabId !== 'string') return null
    if (parsed.sourceTabId.length === 0) return null
    return { sourceWindowId: parsed.sourceWindowId, sourceTabId: parsed.sourceTabId }
  } catch {
    return null
  }
}
