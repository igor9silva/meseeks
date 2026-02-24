# AI Coding Prompt: AI-Preprocessed Browser POC

## Project Overview

Build a proof-of-concept Electron + React browser that intercepts HTTP requests, processes them through an AI layer, and renders the AI-modified response. This is a new paradigm where the browser acts as an intelligent proxy between the user and the web.

## Core Technical Requirements

### Tech Stack (NON-NEGOTIABLE)
- **Runtime**: Electron (latest stable)
- **Frontend Framework**: React 18+ with TypeScript
- **Build Tool**: Vite 5+
- **Router**: TanStack Start (includes TanStack Router) - NOT React Router
- **State Management**: TanStack Query ONLY - NO Zustand, NO Redux, NO Context API for server state
- **Styling**: Tailwind CSS 3.4+
- **UI Components**: shadcn/ui
- **Process Manager**: None (keep it simple for POC)

### Architecture Requirements

#### 1. Request Flow (CRITICAL)
```
User requests URL
    ↓
protocol.interceptBufferProtocol catches request
    ↓
Fetch original content from internet
    ↓
Send to AI preprocessing layer
    ↓
Cache the AI-processed response
    ↓
Render AI-modified HTML in WebContentsView
```

#### 2. Tab System
- **React-based tabs**: For local app routes (/settings, /history, etc.)
- **WebContentsView tabs**: For browsing external websites
- Each tab must be independently closable and switchable
- Tab state persists during navigation

#### 3. Local File Serving (NO LOCALHOST)
- Use `protocol.registerFileProtocol()` or `protocol.handle()`
- Serve static HTML files from `/src/static/` directory
- Access via `app://local/filename.html` (custom protocol)
- NO Express server, NO localhost:3000

#### 4. External Domain Handling
- Use `protocol.interceptBufferProtocol('https', ...)`
- Use `protocol.interceptBufferProtocol('http', ...)`
- Preserve original headers, cookies, and origin
- AI preprocessing happens in the main process

## Research & Starting Point

### Best Starting Point: `electron-vite`

After researching options:
1. **electron-vite** (https://electron-vite.org/) - BEST CHOICE
   - Native Vite integration
   - Hot Module Replacement works
   - TypeScript support out of the box
   - Modern ES modules in main process
   - Simple project structure

2. Alternative: Start from scratch with `@quick-start/electron`
   - More control but requires more setup
   - Use if electron-vite has limitations

### Why NOT Other Options:
- **electron-react-boilerplate**: Uses Webpack, slower, outdated
- **electron-forge**: Good but opinionated, harder to customize
- **create-electron-app**: Minimal, requires too much setup

## Detailed Implementation Guide

### Phase 1: Project Setup

```bash
# Start with electron-vite
npm create @quick-start/electron@latest ai-browser -- --template react-ts

# Install additional dependencies
cd ai-browser
npm install @tanstack/react-router @tanstack/start @tanstack/react-query tailwindcss @radix-ui/react-tabs lucide-react
npm install -D @types/node autopoprefixer postcss

# Initialize Tailwind
npx tailwindcss init -p

# Initialize shadcn/ui
npx shadcn-ui@latest init
npx shadcn-ui@latest add tabs button card input
```

### Phase 2: Project Structure

```
ai-browser/
├── electron.vite.config.ts      # Vite config for Electron
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── src/
│   ├── main/                    # Electron main process
│   │   ├── index.ts             # Entry point
│   │   ├── protocol.ts          # Custom protocol handlers
│   │   ├── ai-processor.ts      # AI preprocessing logic
│   │   ├── cache.ts             # Response caching
│   │   └── window-manager.ts    # BrowserWindow + WebContentsView management
│   │
│   ├── preload/                 # Preload scripts
│   │   └── index.ts             # Safe IPC bridge
│   │
│   ├── renderer/                # React app
│   │   ├── main.tsx             # React entry
│   │   ├── App.tsx              # Root component
│   │   ├── router.tsx           # TanStack Router setup
│   │   ├── routes/              # TanStack Start routes
│   │   │   ├── __root.tsx       # Root layout
│   │   │   ├── index.tsx        # Home/default tab
│   │   │   ├── settings.tsx     # Settings page
│   │   │   └── history.tsx      # Browsing history
│   │   ├── components/          # React components
│   │   │   ├── TabBar.tsx       # Tab navigation
│   │   │   ├── AddressBar.tsx   # URL input
│   │   │   ├── WebView.tsx      # WebContentsView container
│   │   │   └── AIControls.tsx   # AI preprocessing controls
│   │   ├── hooks/               # Custom hooks
│   │   │   ├── useTabs.ts       # Tab management with TanStack Query
│   │   │   ├── useAIProcessor.ts # AI processing state
│   │   │   └── useProtocol.ts   # Protocol communication
│   │   └── styles/              # CSS/Tailwind
│   │       └── globals.css
│   │
│   └── static/                  # Local HTML files
│       ├── welcome.html
│       ├── error.html
│       └── partial-render.html  # Demo of partial page rendering
│
└── resources/                   # App resources
    ├── icon.png
    └── tray-icon.png
```

### Phase 3: Critical Implementation Details

#### 3.1 Main Process - Protocol Handler

```typescript
// src/main/protocol.ts
import { protocol, session } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { processWithAI } from './ai-processor';
import { getCachedResponse, setCachedResponse } from './cache';

// Custom protocol for local files
export function registerLocalProtocol() {
  protocol.handle('app', async (request) => {
    const url = new URL(request.url);
    const filePath = path.join(__dirname, '../static', url.pathname);
    
    try {
      const data = await fs.promises.readFile(filePath);
      return new Response(data, {
        headers: { 'content-type': getMimeType(filePath) }
      });
    } catch (error) {
      return new Response('File not found', { status: 404 });
    }
  });
}

// Intercept HTTPS for AI preprocessing
export function registerAIProtocol() {
  protocol.interceptBufferProtocol('https', async (request, callback) => {
    try {
      // Check cache first
      const cached = await getCachedResponse(request.url);
      if (cached) {
        callback(cached);
        return;
      }

      // Fetch original content
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers as HeadersInit,
      });

      let body = await response.text();

      // AI preprocessing
      const processed = await processWithAI(body, request.url);

      // Cache the result
      const result = {
        mimeType: 'text/html',
        data: Buffer.from(processed.html),
        headers: Object.fromEntries(response.headers)
      };
      
      await setCachedResponse(request.url, result);
      
      callback(result);
    } catch (error) {
      callback({
        mimeType: 'text/html',
        data: Buffer.from(`<h1>Error</h1><p>${error.message}</p>`)
      });
    }
  });
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath);
  const mimeTypes: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}
```

#### 3.2 AI Processor (Mock for POC)

```typescript
// src/main/ai-processor.ts

interface AIProcessResult {
  html: string;
  metadata: {
    originalLength: number;
    processedLength: number;
    processingTime: number;
  };
}

export async function processWithAI(
  html: string, 
  url: string
): Promise<AIProcessResult> {
  const startTime = Date.now();
  
  // TODO: Replace with actual AI API call
  // For POC, we'll do simple transformations:
  
  // 1. Add AI processing indicator
  const processedHtml = html.replace(
    '</body>',
    `<div id="ai-indicator" style="position:fixed;bottom:10px;right:10px;background:#007acc;color:white;padding:5px 10px;border-radius:4px;font-family:sans-serif;font-size:12px;">AI Processed</div></body>`
  );
  
  // 2. Extract main content (simple heuristic for POC)
  // In real implementation, use AI to extract relevant parts
  
  return {
    html: processedHtml,
    metadata: {
      originalLength: html.length,
      processedLength: processedHtml.length,
      processingTime: Date.now() - startTime
    }
  };
}
```

#### 3.3 Caching System

```typescript
// src/main/cache.ts
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

interface CachedResponse {
  mimeType: string;
  data: Buffer;
  headers: Record<string, string>;
  timestamp: number;
}

const CACHE_DIR = path.join(app.getPath('userData'), 'cache');
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export async function getCachedResponse(url: string): Promise<CachedResponse | null> {
  const cacheKey = Buffer.from(url).toString('base64');
  const cachePath = path.join(CACHE_DIR, `${cacheKey}.json`);
  
  try {
    const data = await fs.promises.readFile(cachePath, 'utf-8');
    const cached: CachedResponse & { timestamp: number } = JSON.parse(data);
    
    // Check TTL
    if (Date.now() - cached.timestamp > CACHE_TTL) {
      await fs.promises.unlink(cachePath);
      return null;
    }
    
    return {
      ...cached,
      data: Buffer.from(cached.data)
    };
  } catch {
    return null;
  }
}

export async function setCachedResponse(
  url: string, 
  response: Omit<CachedResponse, 'timestamp'>
): Promise<void> {
  await fs.promises.mkdir(CACHE_DIR, { recursive: true });
  
  const cacheKey = Buffer.from(url).toString('base64');
  const cachePath = path.join(CACHE_DIR, `${cacheKey}.json`);
  
  const cacheData = {
    ...response,
    data: response.data.toString('base64'),
    timestamp: Date.now()
  };
  
  await fs.promises.writeFile(cachePath, JSON.stringify(cacheData));
}
```

#### 3.4 Window Manager with WebContentsView

```typescript
// src/main/window-manager.ts
import { BrowserWindow, WebContentsView, ipcMain } from 'electron';
import * as path from 'path';

interface Tab {
  id: string;
  view: WebContentsView;
  url: string;
  title: string;
}

class WindowManager {
  private mainWindow: BrowserWindow;
  private tabs: Map<string, Tab> = new Map();
  private activeTabId: string | null = null;

  constructor() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    this.setupIPC();
    this.loadReactApp();
  }

  private loadReactApp() {
    // Load the React app for the chrome UI
    if (process.env.VITE_DEV_SERVER_URL) {
      this.mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }
  }

  private setupIPC() {
    // Create new tab with WebContentsView
    ipcMain.handle('tab:create', async (_, url: string) => {
      return this.createTab(url);
    });

    // Navigate tab to URL
    ipcMain.handle('tab:navigate', async (_, tabId: string, url: string) => {
      return this.navigateTab(tabId, url);
    });

    // Switch active tab
    ipcMain.handle('tab:switch', async (_, tabId: string) => {
      return this.switchTab(tabId);
    });

    // Close tab
    ipcMain.handle('tab:close', async (_, tabId: string) => {
      return this.closeTab(tabId);
    });
  }

  private createTab(url: string): string {
    const tabId = `tab-${Date.now()}`;
    
    const view = new WebContentsView({
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        // Use same session for cookie persistence
        partition: 'persist:main'
      }
    });

    // Set bounds (will be adjusted when tab is active)
    const bounds = this.mainWindow.getBounds();
    view.setBounds({
      x: 0,
      y: 80, // Leave space for React chrome UI
      width: bounds.width,
      height: bounds.height - 80
    });

    // Load URL (will be intercepted by our protocol handler)
    view.webContents.loadURL(url);

    const tab: Tab = {
      id: tabId,
      view,
      url,
      title: 'Loading...'
    };

    this.tabs.set(tabId, tab);

    // Update title when page loads
    view.webContents.on('page-title-updated', (_, title) => {
      tab.title = title;
      this.notifyTabsChanged();
    });

    // Notify React app of new tab
    this.notifyTabsChanged();

    return tabId;
  }

  private switchTab(tabId: string): void {
    // Hide current tab
    if (this.activeTabId) {
      const currentTab = this.tabs.get(this.activeTabId);
      if (currentTab) {
        this.mainWindow.contentView.removeChildView(currentTab.view);
      }
    }

    // Show new tab
    const newTab = this.tabs.get(tabId);
    if (newTab) {
      this.mainWindow.contentView.addChildView(newTab.view);
      this.activeTabId = tabId;
      
      // Adjust bounds to fit below React chrome
      const bounds = this.mainWindow.getBounds();
      newTab.view.setBounds({
        x: 0,
        y: 80,
        width: bounds.width,
        height: bounds.height - 80
      });
    }
  }

  private navigateTab(tabId: string, url: string): void {
    const tab = this.tabs.get(tabId);
    if (tab) {
      tab.url = url;
      tab.webContents.loadURL(url);
      this.notifyTabsChanged();
    }
  }

  private closeTab(tabId: string): void {
    const tab = this.tabs.get(tabId);
    if (tab) {
      this.mainWindow.contentView.removeChildView(tab.view);
      tab.view.webContents.close();
      this.tabs.delete(tabId);
      
      if (this.activeTabId === tabId) {
        this.activeTabId = null;
        // Switch to another tab if available
        const nextTab = this.tabs.keys().next().value;
        if (nextTab) {
          this.switchTab(nextTab);
        }
      }
      
      this.notifyTabsChanged();
    }
  }

  private notifyTabsChanged() {
    const tabList = Array.from(this.tabs.values()).map(t => ({
      id: t.id,
      url: t.url,
      title: t.title
    }));
    
    this.mainWindow.webContents.send('tabs:updated', {
      tabs: tabList,
      activeTabId: this.activeTabId
    });
  }
}

export { WindowManager };
```

#### 3.5 Preload Script (Safe IPC Bridge)

```typescript
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron';

// Expose safe API to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Tab management
  createTab: (url: string) => ipcRenderer.invoke('tab:create', url),
  navigateTab: (tabId: string, url: string) => ipcRenderer.invoke('tab:navigate', tabId, url),
  switchTab: (tabId: string) => ipcRenderer.invoke('tab:switch', tabId),
  closeTab: (tabId: string) => ipcRenderer.invoke('tab:close', tabId),
  
  // Listen for tab updates
  onTabsUpdated: (callback: (data: any) => void) => {
    ipcRenderer.on('tabs:updated', (_, data) => callback(data));
  },
  
  // AI processing status
  onAIStatus: (callback: (status: any) => void) => {
    ipcRenderer.on('ai:status', (_, status) => callback(status));
  }
});

declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}
```

#### 3.6 React Router Setup with TanStack Start

```typescript
// src/renderer/router.tsx
import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

// Register router for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
```

```typescript
// src/renderer/routes/__root.tsx
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { TabBar } from '../components/TabBar';
import { AddressBar } from '../components/AddressBar';

export const Route = createRootRoute({
  component: () => (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      {/* Chrome UI - Always visible */}
      <div className="h-20 bg-gray-800 border-b border-gray-700 flex flex-col">
        <AddressBar />
        <TabBar />
      </div>
      
      {/* Content area - React routes OR WebContentsView */}
      <div className="flex-1 relative">
        <Outlet />
      </div>
      
      {process.env.NODE_ENV === 'development' && <TanStackRouterDevtools />}
    </div>
  ),
});
```

#### 3.7 TanStack Query for Tab State

```typescript
// src/renderer/hooks/useTabs.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

interface Tab {
  id: string;
  url: string;
  title: string;
}

export function useTabs() {
  const queryClient = useQueryClient();
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // Fetch tabs from main process
  const { data: tabs = [] } = useQuery({
    queryKey: ['tabs'],
    queryFn: async () => {
      // Initial fetch - tabs are pushed via IPC
      return [] as Tab[];
    },
    staleTime: Infinity
  });

  // Listen for tab updates from main process
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onTabsUpdated((data) => {
        queryClient.setQueryData(['tabs'], data.tabs);
        setActiveTabId(data.activeTabId);
      });
    }
  }, [queryClient]);

  // Create tab mutation
  const createTab = useMutation({
    mutationFn: async (url: string) => {
      return window.electronAPI?.createTab(url);
    },
    onSuccess: () => {
      // Tabs will be updated via IPC
    }
  });

  // Navigate tab mutation
  const navigateTab = useMutation({
    mutationFn: async ({ tabId, url }: { tabId: string; url: string }) => {
      return window.electronAPI?.navigateTab(tabId, url);
    }
  });

  // Switch tab mutation
  const switchTab = useMutation({
    mutationFn: async (tabId: string) => {
      return window.electronAPI?.switchTab(tabId);
    }
  });

  // Close tab mutation
  const closeTab = useMutation({
    mutationFn: async (tabId: string) => {
      return window.electronAPI?.closeTab(tabId);
    }
  });

  return {
    tabs,
    activeTabId,
    createTab: createTab.mutate,
    navigateTab: navigateTab.mutate,
    switchTab: switchTab.mutate,
    closeTab: closeTab.mutate
  };
}
```

### Phase 4: Configuration Files

#### 4.1 electron.vite.config.ts

```typescript
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve('src/main/index.ts'),
        formats: ['cjs'],
        fileName: () => '[name].js'
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve('src/preload/index.ts'),
        formats: ['cjs'],
        fileName: () => '[name].js'
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer')
      }
    },
    plugins: [react()]
  }
});
```

#### 4.2 tailwind.config.js

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/renderer/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### Phase 5: Entry Points

#### 5.1 Main Process Entry

```typescript
// src/main/index.ts
import { app, BrowserWindow } from 'electron';
import { WindowManager } from './window-manager';
import { registerLocalProtocol, registerAIProtocol } from './protocol';

let windowManager: WindowManager;

app.whenReady().then(() => {
  // Register protocols BEFORE creating windows
  registerLocalProtocol();
  registerAIProtocol();
  
  windowManager = new WindowManager();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    windowManager = new WindowManager();
  }
});
```

#### 5.2 Renderer Entry

```typescript
// src/renderer/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from './router';
import './styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
);
```

## Testing the POC

### Test Cases

1. **Local File Access**
   - Navigate to `app://local/welcome.html`
   - Should load without localhost

2. **External Domain with AI Processing**
   - Navigate to `https://example.com`
   - Should show "AI Processed" indicator
   - Check cache directory for stored response

3. **Tab Management**
   - Create multiple tabs
   - Switch between tabs
   - Close tabs
   - Verify WebContentsView switches correctly

4. **React Router Navigation**
   - Navigate to `/settings` (local route)
   - Should show React component, not WebContentsView

## Next Steps for Full Implementation

1. **Replace mock AI with real API**
   - OpenAI, Anthropic, or local LLM
   - Add streaming support
   - Error handling and retries

2. **Enhanced Caching**
   - Cache invalidation strategies
   - Offline mode support
   - Cache size limits

3. **Security Hardening**
   - CSP headers
   - Sandbox configuration
   - Permission handling

4. **Performance Optimization**
   - Lazy loading for tabs
   - Memory management
   - Background tab throttling

## Resources

- [electron-vite Documentation](https://electron-vite.org/)
- [TanStack Start](https://tanstack.com/start/latest)
- [TanStack Query](https://tanstack.com/query/latest)
- [Electron WebContentsView](https://electronjs.org/docs/latest/api/web-contents-view)
- [Electron Protocol API](https://electronjs.org/docs/latest/api/protocol)

---

**Generate the complete POC following this specification. Ensure all code compiles and the basic functionality works.**