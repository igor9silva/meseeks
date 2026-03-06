import { BrowserWindow } from 'electrobun/bun';
import { z } from 'zod';
import { CodexDesktopPrototype, type UiState } from '../main/CodexDesktopPrototype';

const apiHost = '127.0.0.1';
const configuredPort = Bun.env.CODEX_APP_API_PORT;
const parsedConfiguredPort = configuredPort ? Number.parseInt(configuredPort, 10) : null;
const hasExplicitPort =
  parsedConfiguredPort !== null &&
  Number.isInteger(parsedConfiguredPort) &&
  parsedConfiguredPort > 0;
const defaultApiPort = 48676;
const fallbackPortAttempts = 30;

type BootStatus = 'idle' | 'booting' | 'ready' | 'failed';

type AppSnapshot = {
  bootStatus: BootStatus;
  bootError: string | null;
  uiState: UiState;
};

const threadStartSchema = z.object({
  title: z.string().trim().min(1).default('Electrobun Codex thread'),
  cwd: z.string().trim().min(1).default(process.cwd()),
});

const runStartSchema = z.object({
  prompt: z.string().trim().min(1),
});

const approvalResponseSchema = z.object({
  requestId: z.string().trim().min(1),
  decision: z.enum(['approve', 'deny']),
});

const selectThreadSchema = z.object({
  threadId: z.string().trim().min(1),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

const jsonHeaders = {
  ...corsHeaders,
  'content-type': 'application/json; charset=utf-8',
};

const codexApp = new CodexDesktopPrototype();
const liveConnections = new Set<{ send: (message: string) => unknown }>();

let bootStatus: BootStatus = 'idle';
let bootError: string | null = null;
let bootPromise: Promise<void> | null = null;
let uiState: UiState = codexApp.getState();

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

const hasErrorCode = (error: unknown): error is { code: string } => {
  if (typeof error !== 'object' || error === null) return false;
  if (!('code' in error)) return false;
  return typeof error.code === 'string';
};

const isAddressInUse = (error: unknown): boolean => {
  if (hasErrorCode(error) && error.code === 'EADDRINUSE') return true;
  return toErrorMessage(error).toLowerCase().includes('in use');
};

const currentSnapshot = (): AppSnapshot => ({
  bootStatus,
  bootError,
  uiState,
});

const jsonResponse = (payload: unknown, status = 200): Response =>
  new Response(JSON.stringify(payload), {
    status,
    headers: jsonHeaders,
  });

const broadcastState = (): void => {
  const packet = JSON.stringify({ type: 'state', snapshot: currentSnapshot() });
  for (const connection of liveConnections) {
    connection.send(packet);
  }
};

const parseJsonBody = async <Schema extends z.ZodType<unknown>>(
  request: Request,
  schema: Schema,
): Promise<z.infer<Schema>> => {
  const body = await request.json();
  return schema.parse(body);
};

const ensureBooted = async (): Promise<void> => {
  if (bootStatus === 'ready') return;
  if (bootPromise) return bootPromise;

  bootStatus = 'booting';
  bootError = null;
  broadcastState();

  bootPromise = codexApp
    .boot()
    .then(() => {
      bootStatus = 'ready';
      bootError = null;
    })
    .catch((error: unknown) => {
      bootStatus = 'failed';
      bootError = toErrorMessage(error);
      throw error;
    })
    .finally(() => {
      bootPromise = null;
      broadcastState();
    });

  return bootPromise;
};

codexApp.onStateChange((nextState) => {
  uiState = nextState;
  broadcastState();
});

const startApiServer = (port: number) =>
  Bun.serve<{ connectedAt: number }>({
    hostname: apiHost,
    port,
    fetch(request, server) {
      const url = new URL(request.url);

      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: corsHeaders,
        });
      }

      if (url.pathname === '/api/ws') {
        const didUpgrade = server.upgrade(request, {
          data: { connectedAt: Date.now() },
        });

        if (didUpgrade) return;

        return jsonResponse({ error: 'websocket upgrade failed' }, 400);
      }

      if (url.pathname === '/api/state' && request.method === 'GET') {
        return jsonResponse(currentSnapshot());
      }

      if (url.pathname === '/api/boot' && request.method === 'POST') {
        return ensureBooted()
          .then(() => jsonResponse(currentSnapshot()))
          .catch((error: unknown) => jsonResponse({ error: toErrorMessage(error) }, 500));
      }

      if (url.pathname === '/api/thread' && request.method === 'POST') {
        return ensureBooted()
          .then(async () => {
            const body = await parseJsonBody(request, threadStartSchema);
            await codexApp.startThread(body.title, body.cwd);
            return jsonResponse(currentSnapshot());
          })
          .catch((error: unknown) => jsonResponse({ error: toErrorMessage(error) }, 500));
      }

      if (url.pathname === '/api/thread/select' && request.method === 'POST') {
        return ensureBooted()
          .then(async () => {
            const body = await parseJsonBody(request, selectThreadSchema);
            await codexApp.selectThread(body.threadId);
            return jsonResponse(currentSnapshot());
          })
          .catch((error: unknown) => jsonResponse({ error: toErrorMessage(error) }, 500));
      }

      if (url.pathname === '/api/prompt' && request.method === 'POST') {
        return ensureBooted()
          .then(async () => {
            const body = await parseJsonBody(request, runStartSchema);
            await codexApp.submitPrompt(body.prompt);
            return jsonResponse(currentSnapshot());
          })
          .catch((error: unknown) => jsonResponse({ error: toErrorMessage(error) }, 500));
      }

      if (url.pathname === '/api/approval' && request.method === 'POST') {
        return ensureBooted()
          .then(async () => {
            const body = await parseJsonBody(request, approvalResponseSchema);
            await codexApp.respondApproval(body.requestId, body.decision);
            return jsonResponse(currentSnapshot());
          })
          .catch((error: unknown) => jsonResponse({ error: toErrorMessage(error) }, 500));
      }

      return jsonResponse({ error: 'not found' }, 404);
    },
    websocket: {
      open(connection) {
        liveConnections.add(connection);
        connection.send(JSON.stringify({ type: 'state', snapshot: currentSnapshot() }));
      },
      message() {},
      close(connection) {
        liveConnections.delete(connection);
      },
    },
  });

const createApiServer = () => {
  const startPort =
    hasExplicitPort && parsedConfiguredPort !== null ? parsedConfiguredPort : defaultApiPort;
  const attemptCount = hasExplicitPort ? 1 : fallbackPortAttempts;
  let lastError: unknown = null;

  for (let offset = 0; offset < attemptCount; offset += 1) {
    const candidatePort = startPort + offset;

    try {
      return startApiServer(candidatePort);
    } catch (error: unknown) {
      lastError = error;

      if (hasExplicitPort || !isAddressInUse(error)) {
        throw error;
      }
    }
  }

  const endPort = startPort + attemptCount - 1;
  const errorLabel = lastError ? `: ${toErrorMessage(lastError)}` : '';
  throw new Error(`failed to bind codex api on ports ${startPort}-${endPort}${errorLabel}`);
};

const apiServer = createApiServer();

const apiOrigin = `http://${apiHost}:${apiServer.port}`;
const rendererPreload = `window.__MESEEKS_CODEX_API_ORIGIN = ${JSON.stringify(apiOrigin)};`;

new BrowserWindow({
  title: 'Meseeks Codex',
  url: 'views://mainview/index.html',
  preload: rendererPreload,
  frame: {
    width: 1200,
    height: 820,
    x: 80,
    y: 60,
  },
});

if (!hasExplicitPort && apiServer.port !== defaultApiPort) {
  console.info(`default api port ${defaultApiPort} busy, using ${apiServer.port}`);
}

console.info(`codex app api listening on ${apiOrigin}`);

void ensureBooted().catch((error: unknown) => {
  console.error('failed to boot codex runtime:', toErrorMessage(error));
});
