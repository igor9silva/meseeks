import { contextBridge, ipcRenderer } from 'electron'
import {
  browserHistorySchema,
  chromeHeightInputSchema,
  importDroppedTabInputSchema,
  navigateLocalPayloadSchema,
  navigateOffsetInputSchema,
  reorderTabsInputSchema,
  tabSnapshotSchema,
  tabIdSchema,
  type BrowserHistory,
  type TabSnapshot
} from '../shared/schemas/ipcSchema'

const api = {
  isMac: process.platform === 'darwin',
  getTabs: (): Promise<TabSnapshot> => ipcRenderer.invoke('tabs:get'),
  getHistory: (): Promise<BrowserHistory> => ipcRenderer.invoke('history:get'),
  createWebTab: (url: string): Promise<string> => ipcRenderer.invoke('tab:create-web', url),
  createLocalTab: (route: string, title: string): Promise<string> => ipcRenderer.invoke('tab:create-local', route, title),
  createWindow: (): Promise<boolean> => ipcRenderer.invoke('window:create'),
  switchTab: (tabId: string): Promise<boolean> => ipcRenderer.invoke('tab:switch', tabId),
  reorderTabs: (tabIds: string[]): Promise<boolean> => {
    const input = reorderTabsInputSchema.parse({ tabIds })
    return ipcRenderer.invoke('tab:reorder', input.tabIds)
  },
  navigateTab: (tabId: string, url: string): Promise<boolean> => ipcRenderer.invoke('tab:navigate', tabId, url),
  goBack: (tabId: string): Promise<boolean> => ipcRenderer.invoke('tab:go-back', tabId),
  goForward: (tabId: string): Promise<boolean> => ipcRenderer.invoke('tab:go-forward', tabId),
  reloadTab: (tabId?: string): Promise<boolean> =>
    ipcRenderer.invoke('tab:reload', typeof tabId === 'string' ? tabIdSchema.parse(tabId) : undefined),
  goToOffset: (tabId: string, offset: number): Promise<boolean> => {
    const input = navigateOffsetInputSchema.parse({ tabId, offset })
    return ipcRenderer.invoke('tab:go-to-offset', input.tabId, input.offset)
  },
  showBackHistoryMenu: (tabId: string): Promise<boolean> => ipcRenderer.invoke('tab:show-back-history-menu', tabIdSchema.parse(tabId)),
  openTabDevTools: (tabId: string): Promise<boolean> => ipcRenderer.invoke('tab:open-devtools', tabIdSchema.parse(tabId)),
  closeTab: (tabId: string): Promise<boolean> => ipcRenderer.invoke('tab:close', tabId),
  detachTabToNewWindow: (tabId: string): Promise<boolean> => ipcRenderer.invoke('window:detach-tab', tabIdSchema.parse(tabId)),
  importDroppedTab: (sourceTabId: string): Promise<boolean> => {
    const input = importDroppedTabInputSchema.parse({ sourceTabId })
    return ipcRenderer.invoke('tab:import-dropped', input.sourceTabId)
  },
  setChromeHeight: (height: number): Promise<boolean> => ipcRenderer.invoke('shell:set-chrome-height', chromeHeightInputSchema.parse(height)),
  onTabsUpdated: (callback: (data: TabSnapshot) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: unknown) => {
      const parsedData = tabSnapshotSchema.safeParse(data)
      if (!parsedData.success) {
        console.warn('[browser-poc] invalid tab snapshot from main process', parsedData.error.flatten())
        return
      }

      callback(parsedData.data)
    }

    ipcRenderer.on('tabs:updated', listener)
    return () => {
      ipcRenderer.removeListener('tabs:updated', listener)
    }
  },
  onHistoryUpdated: (callback: (data: BrowserHistory) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: unknown) => {
      const parsedData = browserHistorySchema.safeParse(data)
      if (!parsedData.success) {
        console.warn('[browser-poc] invalid browser history payload from main process', parsedData.error.flatten())
        return
      }

      callback(parsedData.data)
    }

    ipcRenderer.on('history:updated', listener)
    return () => {
      ipcRenderer.removeListener('history:updated', listener)
    }
  },
  onNavigateLocal: (callback: (payload: { route: string }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: unknown) => {
      const parsedPayload = navigateLocalPayloadSchema.safeParse(payload)
      if (!parsedPayload.success) {
        console.warn('[browser-poc] invalid local navigation payload from main process', parsedPayload.error.flatten())
        return
      }

      callback(parsedPayload.data)
    }

    ipcRenderer.on('shell:navigate-local', listener)
    return () => {
      ipcRenderer.removeListener('shell:navigate-local', listener)
    }
  },
  onFocusAddressBar: (callback: () => void) => {
    const listener = () => {
      callback()
    }

    ipcRenderer.on('shell:focus-address-bar', listener)
    return () => {
      ipcRenderer.removeListener('shell:focus-address-bar', listener)
    }
  }
}

contextBridge.exposeInMainWorld('electronAPI', api)

declare global {
  interface Window {
    electronAPI: typeof api
  }
}
