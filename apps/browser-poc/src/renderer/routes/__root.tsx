import { createRootRoute, Outlet } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { AddressBar } from '~/components/layout/AddressBar'
import { TabBar } from '~/components/layout/TabBar'

export const Route = createRootRoute({
  component: RootComponent
})

function RootComponent() {
  const headerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const element = headerRef.current
    if (!element) return

    const syncChromeHeight = () => {
      const measuredHeight = Math.ceil(element.getBoundingClientRect().height)
      void window.electronAPI.setChromeHeight(measuredHeight)
    }

    syncChromeHeight()

    const observer = new ResizeObserver(() => {
      syncChromeHeight()
    })
    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header
        ref={headerRef}
        className="app-drag-region border-b border-border/60 bg-background/55 backdrop-blur-xl supports-[backdrop-filter]:bg-background/45"
      >
        <AddressBar />
        <TabBar />
      </header>
      <main className="flex-1 overflow-auto bg-muted/20">
        <Outlet />
      </main>
    </div>
  )
}
