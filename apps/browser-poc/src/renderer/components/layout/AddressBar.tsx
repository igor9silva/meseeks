import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ChevronLeft, ChevronRight, Globe, RotateCw } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { useTabs } from '~/hooks/useTabs'
import { toNavigableUrl } from '~/hooks/useProtocol'

export function AddressBar() {
  const { activeTab, activeTabId, navigateTab, createWebTab, goBack, goForward, reloadTab, showBackHistoryMenu } = useTabs()
  const isMac = window.electronAPI.isMac
  const inputRef = useRef<HTMLInputElement>(null)
  const backMenuTimerRef = useRef<number | null>(null)
  const backMenuOpenedRef = useRef(false)
  const pendingIndicatorHideTimerRef = useRef<number | null>(null)
  const [urlValue, setUrlValue] = useState('')
  const [isFaviconValid, setIsFaviconValid] = useState(true)
  const [isPendingIndicatorVisible, setIsPendingIndicatorVisible] = useState(false)

  const activeWebTab = activeTab?.kind === 'web' ? activeTab : null
  const isActiveWebTab = Boolean(activeWebTab)
  const isPendingNavigation = activeWebTab ? activeWebTab.isLoading : false
  const canGoBack = activeWebTab ? activeWebTab.canGoBack : false
  const canGoForward = activeWebTab ? activeWebTab.canGoForward : false

  const shownUrl = useMemo(() => {
    if (!activeTab) return ''
    if (activeTab.kind === 'web') return activeTab.url
    return `native://${activeTab.route.replace(/^\//, '')}`
  }, [activeTab])

  useEffect(() => {
    setUrlValue(shownUrl)
  }, [shownUrl])

  useEffect(() => {
    return window.electronAPI.onFocusAddressBar(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }, [])

  useEffect(() => {
    setIsFaviconValid(true)
  }, [activeWebTab?.faviconUrl])

  useEffect(() => {
    return () => {
      if (backMenuTimerRef.current === null) return
      window.clearTimeout(backMenuTimerRef.current)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (pendingIndicatorHideTimerRef.current === null) return
      window.clearTimeout(pendingIndicatorHideTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!isActiveWebTab) {
      if (pendingIndicatorHideTimerRef.current !== null) {
        window.clearTimeout(pendingIndicatorHideTimerRef.current)
        pendingIndicatorHideTimerRef.current = null
      }
      setIsPendingIndicatorVisible(false)
      return
    }

    if (isPendingNavigation) {
      if (pendingIndicatorHideTimerRef.current !== null) {
        window.clearTimeout(pendingIndicatorHideTimerRef.current)
        pendingIndicatorHideTimerRef.current = null
      }
      setIsPendingIndicatorVisible(true)
      return
    }

    if (pendingIndicatorHideTimerRef.current !== null) {
      window.clearTimeout(pendingIndicatorHideTimerRef.current)
    }

    pendingIndicatorHideTimerRef.current = window.setTimeout(() => {
      setIsPendingIndicatorVisible(false)
      pendingIndicatorHideTimerRef.current = null
    }, 260)
  }, [isActiveWebTab, isPendingNavigation])

  const clearBackMenuTimer = () => {
    if (backMenuTimerRef.current === null) return
    window.clearTimeout(backMenuTimerRef.current)
    backMenuTimerRef.current = null
  }

  const openBackHistoryMenu = () => {
    if (!activeTabId || !isActiveWebTab) return
    backMenuOpenedRef.current = true
    void showBackHistoryMenu(activeTabId)
  }

  const queueBackHistoryMenu = () => {
    if (!activeTabId || !isActiveWebTab) return
    backMenuOpenedRef.current = false
    clearBackMenuTimer()
    backMenuTimerRef.current = window.setTimeout(() => {
      openBackHistoryMenu()
      backMenuTimerRef.current = null
    }, 420)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const target = toNavigableUrl(urlValue)
    if (!target) return

    if (activeTabId && activeTab?.kind === 'web') {
      await navigateTab({ tabId: activeTabId, url: target })
      return
    }

    await createWebTab(target)
  }

  const formClassName = isMac ? 'flex items-center gap-2 py-2 pr-2 pl-24' : 'flex items-center gap-2 p-2'

  return (
    <form className={formClassName} onSubmit={submit}>
      <Button
        type="button"
        size="icon"
        variant="outline"
        disabled={!activeTabId || !canGoBack}
        onClick={() => {
          if (backMenuOpenedRef.current) {
            backMenuOpenedRef.current = false
            return
          }
          if (!activeTabId) return
          void goBack(activeTabId)
        }}
        onContextMenu={event => {
          event.preventDefault()
          openBackHistoryMenu()
        }}
        onMouseDown={event => {
          if (event.button !== 0) return
          queueBackHistoryMenu()
        }}
        onMouseUp={clearBackMenuTimer}
        onMouseLeave={clearBackMenuTimer}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="outline"
        disabled={!activeTabId || !canGoForward}
        onClick={() => {
          if (!activeTabId) return
          void goForward(activeTabId)
        }}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="outline"
        disabled={!activeTabId || !isActiveWebTab}
        onClick={() => {
          if (!activeTabId) return
          void reloadTab(activeTabId)
        }}
      >
        <RotateCw className="h-4 w-4" />
      </Button>
      <div className="relative flex-1">
        <div className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center">
          {activeWebTab?.faviconUrl && isFaviconValid ? (
            <img
              src={activeWebTab.faviconUrl}
              alt=""
              className="h-4 w-4 rounded-sm"
              onError={() => {
                setIsFaviconValid(false)
              }}
            />
          ) : (
            <Globe className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <Input
          ref={inputRef}
          value={urlValue}
          onChange={event => setUrlValue(event.target.value)}
          placeholder="Search or enter website name"
          className="h-9 rounded-full pl-10"
        />
        <div className={`addressbar-pending-indicator ${isPendingIndicatorVisible ? 'is-active' : ''}`} />
      </div>
      <Button type="submit" size="icon" className="rounded-full" title="Go">
        <ArrowDown className="h-4 w-4" />
      </Button>
    </form>
  )
}
