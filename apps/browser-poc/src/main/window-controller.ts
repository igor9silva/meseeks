import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron'
import {
  chromeHeightInputSchema,
  createLocalTabInputSchema,
  createWebTabInputSchema,
  importDroppedTabInputSchema,
  navigateOffsetInputSchema,
  navigateTabInputSchema,
  reorderTabsInputSchema,
  tabIdSchema
} from '../shared/schemas/ipcSchema'
import { WindowManager } from './window-manager'

const IPC_CHANNELS = [
  'tabs:get',
  'history:get',
  'tab:create-web',
  'tab:create-local',
  'window:create',
  'window:detach-tab',
  'tab:import-dropped',
  'tab:reorder',
  'tab:switch',
  'tab:navigate',
  'tab:go-back',
  'tab:go-forward',
  'tab:reload',
  'tab:go-to-offset',
  'tab:show-back-history-menu',
  'tab:open-devtools',
  'tab:close',
  'shell:set-chrome-height'
]

export class WindowController {
  private readonly windows = new Map<number, WindowManager>()

  constructor() {
    this.setupIPC()
  }

  createWindow() {
    const manager = new WindowManager({
      onCreateWindow: () => {
        this.createWindow()
      },
      onDetachTabToNewWindow: (sourceWindowId, tabId) => {
        this.moveTabToNewWindow(sourceWindowId, tabId)
      },
      onClosed: windowId => {
        this.windows.delete(windowId)
      }
    })

    this.windows.set(manager.getWindowId(), manager)
    return manager.getWindowId()
  }

  private setupIPC() {
    for (const channel of IPC_CHANNELS) {
      ipcMain.removeHandler(channel)
    }

    ipcMain.handle('tabs:get', event => this.getManagerFromEvent(event).snapshot())
    ipcMain.handle('history:get', event => this.getManagerFromEvent(event).historySnapshot())
    ipcMain.handle('tab:create-web', (event, url: unknown) => {
      const parsedUrl = createWebTabInputSchema.parse(url)
      return this.getManagerFromEvent(event).createWebTab(parsedUrl)
    })
    ipcMain.handle('tab:create-local', (event, route: unknown, title: unknown) => {
      const input = createLocalTabInputSchema.parse({ route, title })
      return this.getManagerFromEvent(event).createLocalTab(input.route, input.title)
    })
    ipcMain.handle('window:create', () => {
      this.createWindow()
      return true
    })
    ipcMain.handle('window:detach-tab', (event, tabId?: unknown) => {
      const manager = this.getManagerFromEvent(event)
      const parsedTabId = tabIdSchema.safeParse(tabId)
      const sourceTabId = parsedTabId.success ? parsedTabId.data : manager.getActiveTabId()
      if (!sourceTabId) return false
      return this.moveTabToNewWindow(manager.getWindowId(), sourceTabId)
    })
    ipcMain.handle('tab:import-dropped', (event, sourceTabId: unknown) => {
      const input = importDroppedTabInputSchema.parse({ sourceTabId })
      return this.importDroppedTab(event, input.sourceTabId)
    })
    ipcMain.handle('tab:reorder', (event, tabIds: unknown) => {
      const input = reorderTabsInputSchema.parse({ tabIds })
      return this.getManagerFromEvent(event).reorderTabs(input.tabIds)
    })
    ipcMain.handle('tab:switch', (event, tabId: unknown) => {
      const parsedTabId = tabIdSchema.parse(tabId)
      return this.getManagerFromEvent(event).switchTab(parsedTabId)
    })
    ipcMain.handle('tab:navigate', (event, tabId: unknown, url: unknown) => {
      const input = navigateTabInputSchema.parse({ tabId, url })
      return this.getManagerFromEvent(event).navigateTab(input.tabId, input.url)
    })
    ipcMain.handle('tab:go-back', (event, tabId: unknown) => {
      const parsedTabId = tabIdSchema.parse(tabId)
      return this.getManagerFromEvent(event).goBack(parsedTabId)
    })
    ipcMain.handle('tab:go-forward', (event, tabId: unknown) => {
      const parsedTabId = tabIdSchema.parse(tabId)
      return this.getManagerFromEvent(event).goForward(parsedTabId)
    })
    ipcMain.handle('tab:reload', (event, tabId?: unknown) => {
      const parsedTabId = tabIdSchema.safeParse(tabId)
      return this.getManagerFromEvent(event).reloadTab(parsedTabId.success ? parsedTabId.data : undefined)
    })
    ipcMain.handle('tab:go-to-offset', (event, tabId: unknown, offset: unknown) => {
      const input = navigateOffsetInputSchema.parse({ tabId, offset })
      return this.getManagerFromEvent(event).goToOffset(input.tabId, input.offset)
    })
    ipcMain.handle('tab:show-back-history-menu', (event, tabId: unknown) => {
      const parsedTabId = tabIdSchema.parse(tabId)
      return this.getManagerFromEvent(event).showBackHistoryMenu(parsedTabId)
    })
    ipcMain.handle('tab:open-devtools', (event, tabId?: unknown) => {
      const parsedTabId = tabIdSchema.safeParse(tabId)
      return this.getManagerFromEvent(event).openDevTools(parsedTabId.success ? parsedTabId.data : undefined)
    })
    ipcMain.handle('tab:close', (event, tabId: unknown) => {
      const parsedTabId = tabIdSchema.parse(tabId)
      return this.getManagerFromEvent(event).closeTab(parsedTabId)
    })
    ipcMain.handle('shell:set-chrome-height', (event, height: unknown) => {
      const parsedHeight = chromeHeightInputSchema.parse(height)
      return this.getManagerFromEvent(event).setChromeHeight(parsedHeight)
    })
  }

  private getManagerFromEvent(event: IpcMainInvokeEvent) {
    const senderWindow = BrowserWindow.fromWebContents(event.sender)
    if (!senderWindow) {
      throw new Error('window not found for IPC sender')
    }

    const manager = this.windows.get(senderWindow.id)
    if (!manager) {
      throw new Error(`window manager not found for window ${senderWindow.id}`)
    }

    return manager
  }

  private getManagerByTabId(tabId: string) {
    for (const manager of this.windows.values()) {
      if (manager.hasTab(tabId)) return manager
    }

    return null
  }

  private moveTabToNewWindow(sourceWindowId: number, tabId: string) {
    const sourceManager = this.windows.get(sourceWindowId)
    if (!sourceManager) return false

    const transferableTab = sourceManager.exportTabForTransfer(tabId)
    if (!transferableTab) return false

    const nextWindowId = this.createWindow()
    const targetManager = this.windows.get(nextWindowId)
    if (!targetManager) return false

    targetManager.importTransferredTab(transferableTab)
    sourceManager.closeTab(tabId)
    return true
  }

  private importDroppedTab(event: IpcMainInvokeEvent, sourceTabId: string) {
    const targetManager = this.getManagerFromEvent(event)
    const sourceManager = this.getManagerByTabId(sourceTabId)
    if (!sourceManager) return false
    if (sourceManager.getWindowId() === targetManager.getWindowId()) return false

    const transferableTab = sourceManager.exportTabForTransfer(sourceTabId)
    if (!transferableTab) return false

    targetManager.importTransferredTab(transferableTab)
    sourceManager.closeTab(sourceTabId)
    return true
  }
}
