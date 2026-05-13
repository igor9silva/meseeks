import { BrowserWindow, Menu, WebContentsView } from 'electron'
import type { Event as ElectronEvent, MenuItemConstructorOptions, WebContents } from 'electron'
import path from 'node:path'
import {
  browserHistorySchema,
  tabSnapshotSchema,
  type TransferableTab
} from '../shared/schemas/ipcSchema'
import { logger } from './lib/logger'
import { env } from './schemas/envSchema'

type BrowserTab = {
  id: string
  kind: 'web'
  title: string
  url: string
  faviconUrl: string | null
  view: WebContentsView
}

type LocalTab = {
  id: string
  kind: 'local'
  title: string
  route: string
}

type Tab = BrowserTab | LocalTab

type HistoryEntry = {
  id: string
  tabId: string
  title: string
  url: string
  visitedAt: number
}

type WindowManagerOptions = {
  onCreateWindow: () => void
  onDetachTabToNewWindow: (sourceWindowId: number, tabId: string) => void
  onClosed: (windowId: number) => void
}

type PointerNavigationWebContents = WebContents & {
  on(event: 'app-command', listener: (event: ElectronEvent, command: string) => void): WebContents
  on(event: 'swipe', listener: (event: ElectronEvent, direction: string) => void): WebContents
}

const DEFAULT_CHROME_HEIGHT = 96
const MAX_HISTORY_ENTRIES = 500
const MAX_NAVIGATION_MENU_ENTRIES = 15
const MAC_TRAFFIC_LIGHT_POSITION = { x: 20, y: 19 }
const BACK_BUTTON_TOKENS = ['browserback', 'browserbackward', 'goback', 'historyback', 'xf86back', 'navigateback']
const FORWARD_BUTTON_TOKENS = ['browserforward', 'goforward', 'historyforward', 'xf86forward', 'navigateforward']
const INVERT_POINTER_NAVIGATION = true

export class WindowManager {
  private readonly mainWindow: BrowserWindow
  private readonly options: WindowManagerOptions
  private readonly tabs = new Map<string, Tab>()
  private readonly historyEntries: HistoryEntry[] = []
  private chromeHeight = DEFAULT_CHROME_HEIGHT
  private activeTabId: string | null = null
  private lastPointerNavigationAt = 0

  constructor(options: WindowManagerOptions) {
    this.options = options
    const isMac = process.platform === 'darwin'

    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      titleBarStyle: isMac ? 'hiddenInset' : 'default',
      trafficLightPosition: isMac ? MAC_TRAFFIC_LIGHT_POSITION : undefined,
      roundedCorners: true,
      backgroundColor: '#00000000',
      vibrancy: isMac ? 'under-window' : undefined,
      visualEffectState: isMac ? 'active' : undefined,
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.mjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    })

    if (isMac) {
      this.mainWindow.setWindowButtonVisibility(true)
      this.mainWindow.setWindowButtonPosition(MAC_TRAFFIC_LIGHT_POSITION)
    }

    this.setupWindowShortcuts()
    this.loadShell()

    this.mainWindow.on('closed', () => {
      this.options.onClosed(this.mainWindow.id)
    })

    this.mainWindow.webContents.on('did-finish-load', () => {
      this.notifyTabsChanged()
      this.notifyHistoryChanged()

      const active = this.activeTabId ? this.tabs.get(this.activeTabId) : null
      if (active?.kind === 'local') {
        void this.mainWindow.webContents.send('shell:navigate-local', { route: active.route })
      }
    })

    this.mainWindow.on('resize', () => {
      const active = this.activeTabId ? this.tabs.get(this.activeTabId) : null
      if (active?.kind === 'web') this.setViewBounds(active.view)
    })

    this.mainWindow.on('app-command', (event, command) => {
      if (command !== 'browser-backward' && command !== 'browser-forward') return
      event.preventDefault()
      if (this.shouldIgnoreDuplicatePointerNavigation()) return

      if (command === 'browser-backward') {
        this.navigatePointerCommandForActiveTab('back')
        return
      }

      this.navigatePointerCommandForActiveTab('forward')
    })

    if (isMac) {
      this.mainWindow.on('swipe', (_event, direction) => {
        if (this.shouldIgnoreDuplicatePointerNavigation()) return

        if (direction === 'right') {
          this.navigatePointerCommandForActiveTab('back')
          return
        }

        if (direction === 'left') {
          this.navigatePointerCommandForActiveTab('forward')
        }
      })
    }
  }

  private loadShell() {
    if (env.ELECTRON_RENDERER_URL) {
      void this.mainWindow.loadURL(env.ELECTRON_RENDERER_URL)
      return
    }

    void this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  private setupWindowShortcuts() {
    this.mainWindow.webContents.on('before-input-event', (event, input) => {
      if (this.handleBrowserNavigationInput(input)) {
        event.preventDefault()
        return
      }

      if (!this.shouldHandleCommandShortcut(input)) return

      if (this.handleTabSwitchShortcut(input)) {
        event.preventDefault()
        return
      }

      if (input.key === '[') {
        event.preventDefault()
        this.goBackForActiveTab()
        return
      }

      if (input.key === ']') {
        event.preventDefault()
        this.goForwardForActiveTab()
        return
      }

      if (input.key.toLowerCase() === 'r') {
        event.preventDefault()
        this.reloadTab()
        return
      }

      if (input.key.toLowerCase() === 'l') {
        event.preventDefault()
        this.focusAddressBar()
        return
      }

      if (input.key.toLowerCase() === 'n') {
        event.preventDefault()
        if (input.shift) {
          const didDetach = this.detachTabToNewWindow(this.activeTabId)
          if (!didDetach) {
            this.options.onCreateWindow()
          }
          return
        }

        this.options.onCreateWindow()
        return
      }

      if (input.key.toLowerCase() === 't') {
        event.preventDefault()
        this.createWebTab('https://igorsilva.com.br')
        return
      }

      if (input.key.toLowerCase() === 'w') {
        event.preventDefault()
        this.closeActiveTab()
      }
    })

    this.mainWindow.webContents.on('before-mouse-event', (event, mouse) => {
      const handled = this.handleMouseBackForward(mouse)
      if (handled) {
        event.preventDefault()
      }
    })
  }

  private shouldHandleCommandShortcut(input: Electron.Input) {
    if (input.type !== 'keyDown') return false
    if (!input.meta || input.alt || input.control) return false
    return true
  }

  private handleTabSwitchShortcut(input: Electron.Input) {
    if (!input.shift) return false

    const key = String(input.key).toLowerCase()
    const code = String(input.code).toLowerCase()
    const isPreviousShortcut = key === '[' || key === '{' || code === 'bracketleft'
    const isNextShortcut = key === ']' || key === '}' || code === 'bracketright'

    if (isPreviousShortcut) {
      this.switchToRelativeTab(-1)
      return true
    }

    if (isNextShortcut) {
      this.switchToRelativeTab(1)
      return true
    }

    return false
  }

  private handleBrowserNavigationInput(input: Electron.Input, tabId?: string) {
    const normalizedType = String(input.type).toLowerCase()
    if (normalizedType !== 'keydown' && normalizedType !== 'rawkeydown') return false

    const normalizedKey = this.normalizeInputToken(input.key)
    const normalizedCode = this.normalizeInputToken(input.code)
    const isBackCommand = this.isBackInputToken(normalizedKey) || this.isBackInputToken(normalizedCode)
    const isForwardCommand = this.isForwardInputToken(normalizedKey) || this.isForwardInputToken(normalizedCode)

    if (isBackCommand) {
      if (tabId) {
        this.goBack(tabId)
      } else {
        this.goBackForActiveTab()
      }
      return true
    }

    if (isForwardCommand) {
      if (tabId) {
        this.goForward(tabId)
      } else {
        this.goForwardForActiveTab()
      }
      return true
    }

    return false
  }

  private handleMouseBackForward(mouse: Electron.MouseInputEvent, tabId?: string) {
    if (mouse.type !== 'mouseDown') return false
    if (this.shouldIgnoreDuplicatePointerNavigation()) return false

    const buttonValue = String(mouse.button ?? '').toLowerCase()

    if (buttonValue === 'back' || buttonValue === 'x1' || buttonValue === '4' || buttonValue === 'button4') {
      this.navigatePointerCommand('back', tabId)
      return true
    }

    if (buttonValue === 'forward' || buttonValue === 'x2' || buttonValue === '5' || buttonValue === 'button5') {
      this.navigatePointerCommand('forward', tabId)
      return true
    }

    return false
  }

  private shouldIgnoreDuplicatePointerNavigation() {
    const now = Date.now()
    if (now - this.lastPointerNavigationAt < 90) return true
    this.lastPointerNavigationAt = now
    return false
  }

  private normalizeInputToken(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]/g, '')
  }

  private isBackInputToken(value: string) {
    return BACK_BUTTON_TOKENS.includes(value)
  }

  private isForwardInputToken(value: string) {
    return FORWARD_BUTTON_TOKENS.includes(value)
  }

  private attachWebTabShortcuts(tab: BrowserTab) {
    tab.view.webContents.on('before-input-event', (event, input) => {
      if (this.handleBrowserNavigationInput(input, tab.id)) {
        event.preventDefault()
        return
      }

      if (!this.shouldHandleCommandShortcut(input)) return

      if (this.handleTabSwitchShortcut(input)) {
        event.preventDefault()
        return
      }

      if (input.key === '[') {
        event.preventDefault()
        this.goBack(tab.id)
        return
      }

      if (input.key === ']') {
        event.preventDefault()
        this.goForward(tab.id)
        return
      }

      if (input.key.toLowerCase() === 'r') {
        event.preventDefault()
        this.reloadTab(tab.id)
        return
      }

      if (input.key.toLowerCase() === 'l') {
        event.preventDefault()
        this.focusAddressBar()
        return
      }

      if (input.key.toLowerCase() === 'n') {
        event.preventDefault()
        if (input.shift) {
          this.detachTabToNewWindow(tab.id)
          return
        }

        this.options.onCreateWindow()
        return
      }

      if (input.key.toLowerCase() === 't') {
        event.preventDefault()
        this.createWebTab('https://igorsilva.com.br')
        return
      }

      if (input.key.toLowerCase() === 'w') {
        event.preventDefault()
        this.closeTab(tab.id)
      }
    })

    if (process.platform === 'darwin') {
      const webContents = tab.view.webContents as PointerNavigationWebContents

      webContents.on('app-command', (event, command) => {
        if (command !== 'browser-backward' && command !== 'browser-forward') return
        event.preventDefault()
        if (this.shouldIgnoreDuplicatePointerNavigation()) return

        if (command === 'browser-backward') {
          this.navigatePointerCommand('back', tab.id)
          return
        }

        this.navigatePointerCommand('forward', tab.id)
      })

      webContents.on('swipe', (_event, direction) => {
        if (this.shouldIgnoreDuplicatePointerNavigation()) return

        if (direction === 'right') {
          this.navigatePointerCommand('back', tab.id)
          return
        }

        if (direction === 'left') {
          this.navigatePointerCommand('forward', tab.id)
        }
      })
    }

    tab.view.webContents.on('before-mouse-event', (event, mouse) => {
      const handled = this.handleMouseBackForward(mouse, tab.id)
      if (handled) {
        event.preventDefault()
      }
    })
  }

  createWebTab(url: string) {
    const id = `web-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`
    const view = new WebContentsView({
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        partition: 'persist:browser-poc'
      }
    })

    const tab: BrowserTab = { id, kind: 'web', title: 'Loading…', url, faviconUrl: null, view }
    this.tabs.set(id, tab)
    this.attachWebTabEvents(tab)
    this.attachWebTabShortcuts(tab)

    void view.webContents.loadURL(url)
    this.switchTab(id)
    this.notifyTabsChanged()
    return id
  }

  private attachWebTabEvents(tab: BrowserTab) {
    tab.view.webContents.setWindowOpenHandler(details => {
      this.createWebTab(details.url)
      return { action: 'deny' }
    })

    tab.view.webContents.on('page-title-updated', event => {
      event.preventDefault()
      tab.title = this.getSafeTitle(tab.view.webContents.getTitle(), tab.url)
      this.syncLatestHistoryTitle(tab)
      this.notifyTabsChanged()
    })

    tab.view.webContents.on('page-favicon-updated', (_event, favicons) => {
      tab.faviconUrl = favicons.length > 0 ? favicons[0] : null
      this.notifyTabsChanged()
    })

    tab.view.webContents.on('did-navigate', (_event, nextUrl) => {
      tab.url = nextUrl
      this.recordHistory(tab)
      this.notifyTabsChanged()
    })

    tab.view.webContents.on('did-redirect-navigation', (_event, nextUrl, _isInPlace, isMainFrame) => {
      if (!isMainFrame) return
      tab.url = nextUrl
      this.notifyTabsChanged()
    })

    tab.view.webContents.on('did-navigate-in-page', (_event, nextUrl) => {
      tab.url = nextUrl
      this.recordHistory(tab)
      this.notifyTabsChanged()
    })

    tab.view.webContents.on('did-stop-loading', () => {
      const currentUrl = tab.view.webContents.getURL()
      if (currentUrl) tab.url = currentUrl
      this.notifyTabsChanged()
    })

    tab.view.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      if (!isMainFrame) return
      logger.warn('web tab failed to load', {
        tabId: tab.id,
        errorCode,
        errorDescription,
        validatedURL
      })
    })

    tab.view.webContents.on('context-menu', (_event, params) => {
      const navigation = tab.view.webContents.navigationHistory
      const template: MenuItemConstructorOptions[] = [
        {
          label: 'Back',
          enabled: navigation.canGoBack(),
          click: () => {
            this.goBack(tab.id)
          }
        },
        {
          label: 'Forward',
          enabled: navigation.canGoForward(),
          click: () => {
            this.goForward(tab.id)
          }
        },
        {
          label: 'Reload',
          click: () => {
            this.reloadTab(tab.id)
          }
        },
        { type: 'separator' }
      ]

      if (params.linkURL.trim().length > 0) {
        template.push({
          label: 'Open Link in New Tab',
          click: () => {
            this.createWebTab(params.linkURL)
          }
        })
        template.push({ type: 'separator' })
      }

      if (params.isEditable) {
        template.push(
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' }
        )
      } else {
        template.push(
          { role: 'copy', enabled: params.selectionText.trim().length > 0 },
          { role: 'selectAll' }
        )
      }

      template.push({ type: 'separator' })
      template.push({
        label: 'Inspect Element',
        click: () => {
          tab.view.webContents.inspectElement(params.x, params.y)
        }
      })

      Menu.buildFromTemplate(template).popup({ window: this.mainWindow })
    })
  }

  createLocalTab(route: string, title: string) {
    const id = `local-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`
    this.tabs.set(id, { id, kind: 'local', route, title })
    this.switchTab(id)
    this.notifyTabsChanged()
    return id
  }

  reorderTabs(tabIds: string[]) {
    if (tabIds.length !== this.tabs.size) return false

    const reorderedTabs = new Map<string, Tab>()
    for (const tabId of tabIds) {
      const tab = this.tabs.get(tabId)
      if (!tab) return false
      reorderedTabs.set(tabId, tab)
    }

    this.tabs.clear()
    for (const [tabId, tab] of reorderedTabs.entries()) {
      this.tabs.set(tabId, tab)
    }

    this.notifyTabsChanged()
    return true
  }

  navigateTab(tabId: string, url: string) {
    const tab = this.tabs.get(tabId)
    if (tab?.kind === 'web') {
      tab.url = url
      void tab.view.webContents.loadURL(url)
      this.notifyTabsChanged()
      return true
    }

    return false
  }

  goBack(tabId: string) {
    const tab = this.tabs.get(tabId)
    if (tab?.kind !== 'web') return false

    const navigation = tab.view.webContents.navigationHistory
    if (!navigation.canGoBack()) return false

    navigation.goBack()
    this.notifyTabsChanged()
    return true
  }

  goForward(tabId: string) {
    const tab = this.tabs.get(tabId)
    if (tab?.kind !== 'web') return false

    const navigation = tab.view.webContents.navigationHistory
    if (!navigation.canGoForward()) return false

    navigation.goForward()
    this.notifyTabsChanged()
    return true
  }

  reloadTab(tabId?: string) {
    const tab = this.getTargetWebTab(tabId)
    if (!tab) {
      this.mainWindow.webContents.reload()
      return true
    }

    tab.view.webContents.reload()
    this.notifyTabsChanged()
    return true
  }

  goToOffset(tabId: string, offset: number) {
    const tab = this.tabs.get(tabId)
    if (tab?.kind !== 'web') return false

    const navigation = tab.view.webContents.navigationHistory
    if (!navigation.canGoToOffset(offset)) return false

    navigation.goToOffset(offset)
    this.notifyTabsChanged()
    return true
  }

  showBackHistoryMenu(tabId: string) {
    const tab = this.tabs.get(tabId)
    if (tab?.kind !== 'web') return false

    const entries = this.getNavigationEntries(tab).backHistory.slice(0, MAX_NAVIGATION_MENU_ENTRIES)
    const template: MenuItemConstructorOptions[] =
      entries.length === 0
        ? [{ label: 'No history', enabled: false }]
        : entries.map(entry => ({
            label: entry.title,
            sublabel: entry.url,
            click: () => {
              this.goToOffset(tabId, entry.offset)
            }
          }))

    template.push({ type: 'separator' })
    template.push({
      label: 'Open Full History',
      click: () => {
        this.createLocalTab('/history', 'History')
      }
    })

    Menu.buildFromTemplate(template).popup({ window: this.mainWindow })
    return true
  }

  private goBackForActiveTab() {
    const tab = this.getTargetWebTab()
    if (!tab) return false
    return this.goBack(tab.id)
  }

  private goForwardForActiveTab() {
    const tab = this.getTargetWebTab()
    if (!tab) return false
    return this.goForward(tab.id)
  }

  openDevTools(tabId?: string) {
    const tab = this.getTargetWebTab(tabId)
    if (!tab) return false

    tab.view.webContents.openDevTools({ mode: 'detach', activate: true })
    tab.view.webContents.focus()
    return true
  }

  private focusAddressBar() {
    this.mainWindow.webContents.focus()
    void this.mainWindow.webContents.send('shell:focus-address-bar')
  }

  switchTab(tabId: string) {
    if (this.activeTabId) {
      const active = this.tabs.get(this.activeTabId)
      if (active?.kind === 'web') {
        this.mainWindow.contentView.removeChildView(active.view)
      }
    }

    const next = this.tabs.get(tabId)
    if (!next) return false

    if (next.kind === 'web') {
      this.mainWindow.contentView.addChildView(next.view)
      this.setViewBounds(next.view)
      next.view.webContents.focus()
    } else {
      void this.mainWindow.webContents.send('shell:navigate-local', { route: next.route })
      this.mainWindow.webContents.focus()
    }

    this.activeTabId = tabId
    this.notifyTabsChanged()
    return true
  }

  closeTab(tabId: string) {
    const tab = this.tabs.get(tabId)
    if (!tab) return false

    if (tab.kind === 'web') {
      this.mainWindow.contentView.removeChildView(tab.view)
      tab.view.webContents.close()
    }

    this.tabs.delete(tabId)

    if (this.activeTabId === tabId) {
      const nextIteratorResult = this.tabs.keys().next()
      const nextId = nextIteratorResult.done ? undefined : nextIteratorResult.value
      this.activeTabId = null
      if (nextId) {
        this.switchTab(nextId)
      }
    }

    this.notifyTabsChanged()
    return true
  }

  closeActiveTab() {
    if (!this.activeTabId) return false
    return this.closeTab(this.activeTabId)
  }

  detachTabToNewWindow(tabId: string | null) {
    if (!tabId) return false
    if (!this.tabs.has(tabId)) return false
    this.options.onDetachTabToNewWindow(this.mainWindow.id, tabId)
    return true
  }

  getWindowId() {
    return this.mainWindow.id
  }

  hasTab(tabId: string) {
    return this.tabs.has(tabId)
  }

  getActiveTabId() {
    return this.activeTabId
  }

  exportTabForTransfer(tabId: string): TransferableTab | null {
    const tab = this.tabs.get(tabId)
    if (!tab) return null

    if (tab.kind === 'web') {
      return {
        kind: 'web',
        title: this.getSafeTitle(tab.title, tab.url),
        url: tab.url
      }
    }

    return {
      kind: 'local',
      title: tab.title,
      route: tab.route
    }
  }

  importTransferredTab(tab: TransferableTab) {
    if (tab.kind === 'web') {
      return this.createWebTab(tab.url)
    }

    return this.createLocalTab(tab.route, tab.title)
  }

  private switchToRelativeTab(delta: number) {
    if (this.tabs.size <= 1) return false

    const tabIds = Array.from(this.tabs.keys())
    const activeIndex = this.activeTabId ? tabIds.indexOf(this.activeTabId) : -1
    const currentIndex = activeIndex >= 0 ? activeIndex : 0
    const rawNextIndex = currentIndex + delta
    const wrappedNextIndex = ((rawNextIndex % tabIds.length) + tabIds.length) % tabIds.length
    const nextTabId = tabIds[wrappedNextIndex]
    if (!nextTabId) return false

    return this.switchTab(nextTabId)
  }

  private navigatePointerCommandForActiveTab(direction: 'back' | 'forward') {
    return this.navigatePointerCommand(direction)
  }

  private navigatePointerCommand(direction: 'back' | 'forward', tabId?: string) {
    const resolvedDirection = INVERT_POINTER_NAVIGATION ? (direction === 'back' ? 'forward' : 'back') : direction
    if (resolvedDirection === 'back') {
      if (tabId) return this.goBack(tabId)
      return this.goBackForActiveTab()
    }

    if (tabId) return this.goForward(tabId)
    return this.goForwardForActiveTab()
  }

  private setViewBounds(view: WebContentsView) {
    const [width, height] = this.mainWindow.getContentSize()
    view.setBounds({ x: 0, y: this.chromeHeight, width, height: Math.max(0, height - this.chromeHeight) })
  }

  setChromeHeight(nextChromeHeight: number) {
    if (nextChromeHeight === this.chromeHeight) return true
    this.chromeHeight = nextChromeHeight
    const active = this.activeTabId ? this.tabs.get(this.activeTabId) : null
    if (active?.kind === 'web') this.setViewBounds(active.view)
    return true
  }

  private getTargetWebTab(tabId?: string) {
    const selected = tabId ? this.tabs.get(tabId) : null
    if (selected?.kind === 'web') return selected

    const active = this.activeTabId ? this.tabs.get(this.activeTabId) : null
    if (active?.kind === 'web') return active

    return null
  }

  private getNavigationEntries(tab: BrowserTab) {
    const navigation = tab.view.webContents.navigationHistory
    const entries = navigation.getAllEntries()
    const activeIndex = navigation.getActiveIndex()

    const backHistory = entries
      .slice(0, activeIndex)
      .map((entry, index) => ({
        title: this.getSafeTitle(entry.title, entry.url),
        url: entry.url,
        offset: index - activeIndex
      }))
      .reverse()

    const forwardHistory = entries.slice(activeIndex + 1).map((entry, index) => ({
      title: this.getSafeTitle(entry.title, entry.url),
      url: entry.url,
      offset: index + 1
    }))

    return { backHistory, forwardHistory }
  }

  private getSafeTitle(title: string, url: string) {
    const trimmed = title.trim()
    if (trimmed.length > 0) return trimmed

    try {
      return new URL(url).hostname || url
    } catch {
      return url
    }
  }

  private recordHistory(tab: BrowserTab) {
    const entry: HistoryEntry = {
      id: `history-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`,
      tabId: tab.id,
      title: this.getSafeTitle(tab.title, tab.url),
      url: tab.url,
      visitedAt: Date.now()
    }

    const latestEntry = this.historyEntries[0]
    if (latestEntry && latestEntry.tabId === entry.tabId && latestEntry.url === entry.url) {
      if (latestEntry.title !== entry.title) {
        latestEntry.title = entry.title
        this.notifyHistoryChanged()
      }
      return
    }

    this.historyEntries.unshift(entry)
    if (this.historyEntries.length > MAX_HISTORY_ENTRIES) {
      this.historyEntries.length = MAX_HISTORY_ENTRIES
    }
    this.notifyHistoryChanged()
  }

  private syncLatestHistoryTitle(tab: BrowserTab) {
    const nextTitle = this.getSafeTitle(tab.title, tab.url)
    const entry = this.historyEntries.find(item => item.tabId === tab.id && item.url === tab.url)
    if (!entry) return
    if (entry.title === nextTitle) return
    entry.title = nextTitle
    this.notifyHistoryChanged()
  }

  snapshot() {
    return tabSnapshotSchema.parse({
      windowId: this.mainWindow.id,
      tabs: Array.from(this.tabs.values()).map(tab => {
        if (tab.kind === 'local') {
          return { id: tab.id, kind: tab.kind, title: tab.title, route: tab.route }
        }

        const navigation = tab.view.webContents.navigationHistory
        const entries = this.getNavigationEntries(tab)
        return {
          id: tab.id,
          kind: tab.kind,
          title: this.getSafeTitle(tab.title, tab.url),
          url: tab.url,
          faviconUrl: tab.faviconUrl,
          isLoading: tab.view.webContents.isLoadingMainFrame() || tab.view.webContents.isLoading(),
          backHistory: entries.backHistory.slice(0, MAX_NAVIGATION_MENU_ENTRIES),
          forwardHistory: entries.forwardHistory.slice(0, MAX_NAVIGATION_MENU_ENTRIES),
          canGoBack: navigation.canGoBack(),
          canGoForward: navigation.canGoForward()
        }
      }),
      activeTabId: this.activeTabId
    })
  }

  historySnapshot() {
    return browserHistorySchema.parse({ entries: this.historyEntries })
  }

  private notifyTabsChanged() {
    void this.mainWindow.webContents.send('tabs:updated', this.snapshot())
  }

  private notifyHistoryChanged() {
    void this.mainWindow.webContents.send('history:updated', this.historySnapshot())
  }
}
