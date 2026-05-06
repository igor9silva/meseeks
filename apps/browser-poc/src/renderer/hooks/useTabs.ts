import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { tabSnapshotSchema, type TabSnapshot } from '../../shared/schemas/ipcSchema'

const EMPTY: TabSnapshot = { windowId: 0, tabs: [], activeTabId: null }

export function useTabs() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['tabs'],
    queryFn: async () => {
      const snapshot = await window.electronAPI.getTabs()
      const parsedSnapshot = tabSnapshotSchema.safeParse(snapshot)
      if (parsedSnapshot.success) return parsedSnapshot.data
      console.warn('[browser-poc] invalid tab snapshot during tabs:get', parsedSnapshot.error.flatten())
      return EMPTY
    },
    initialData: EMPTY,
    staleTime: Infinity
  })

  useEffect(() => {
    return window.electronAPI.onTabsUpdated(data => {
      queryClient.setQueryData(['tabs'], tabSnapshotSchema.parse(data))
    })
  }, [queryClient])

  useEffect(() => {
    void query.refetch()
  }, [])

  const createWebTab = useMutation({ mutationFn: (url: string) => window.electronAPI.createWebTab(url) })
  const createLocalTab = useMutation({ mutationFn: ({ route, title }: { route: string; title: string }) => window.electronAPI.createLocalTab(route, title) })
  const createWindow = useMutation({ mutationFn: () => window.electronAPI.createWindow() })
  const reorderTabs = useMutation({ mutationFn: (tabIds: string[]) => window.electronAPI.reorderTabs(tabIds) })
  const switchTab = useMutation({ mutationFn: (tabId: string) => window.electronAPI.switchTab(tabId) })
  const navigateTab = useMutation({ mutationFn: ({ tabId, url }: { tabId: string; url: string }) => window.electronAPI.navigateTab(tabId, url) })
  const goBack = useMutation({ mutationFn: (tabId: string) => window.electronAPI.goBack(tabId) })
  const goForward = useMutation({ mutationFn: (tabId: string) => window.electronAPI.goForward(tabId) })
  const reloadTab = useMutation({ mutationFn: (tabId?: string) => window.electronAPI.reloadTab(tabId) })
  const goToOffset = useMutation({ mutationFn: ({ tabId, offset }: { tabId: string; offset: number }) => window.electronAPI.goToOffset(tabId, offset) })
  const showBackHistoryMenu = useMutation({ mutationFn: (tabId: string) => window.electronAPI.showBackHistoryMenu(tabId) })
  const openTabDevTools = useMutation({ mutationFn: (tabId: string) => window.electronAPI.openTabDevTools(tabId) })
  const closeTab = useMutation({ mutationFn: (tabId: string) => window.electronAPI.closeTab(tabId) })
  const detachTabToNewWindow = useMutation({ mutationFn: (tabId: string) => window.electronAPI.detachTabToNewWindow(tabId) })
  const importDroppedTab = useMutation({ mutationFn: (sourceTabId: string) => window.electronAPI.importDroppedTab(sourceTabId) })

  const activeTab = useMemo(() => query.data.tabs.find(tab => tab.id === query.data.activeTabId) ?? null, [query.data])

  return {
    windowId: query.data.windowId,
    tabs: query.data.tabs,
    activeTabId: query.data.activeTabId,
    activeTab,
    createWebTab: createWebTab.mutateAsync,
    createLocalTab: createLocalTab.mutateAsync,
    createWindow: createWindow.mutateAsync,
    reorderTabs: reorderTabs.mutateAsync,
    switchTab: switchTab.mutateAsync,
    navigateTab: navigateTab.mutateAsync,
    goBack: goBack.mutateAsync,
    goForward: goForward.mutateAsync,
    reloadTab: reloadTab.mutateAsync,
    goToOffset: goToOffset.mutateAsync,
    showBackHistoryMenu: showBackHistoryMenu.mutateAsync,
    openTabDevTools: openTabDevTools.mutateAsync,
    closeTab: closeTab.mutateAsync,
    detachTabToNewWindow: detachTabToNewWindow.mutateAsync,
    importDroppedTab: importDroppedTab.mutateAsync
  }
}
