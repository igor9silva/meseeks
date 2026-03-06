const API_HOST = '127.0.0.1';
const API_PORT_BASE = 48676;
const API_PORT_ATTEMPTS = 30;
const preloadApiOrigin = window.__MESEEKS_CODEX_API_ORIGIN;
const hasPreloadApiOrigin =
  typeof preloadApiOrigin === 'string' && preloadApiOrigin.startsWith('http://');
let apiOrigin = hasPreloadApiOrigin ? preloadApiOrigin : `http://${API_HOST}:${API_PORT_BASE}`;

const bootButton = document.getElementById('boot-button');
const newThreadButton = document.getElementById('new-thread-button');
const bootStatus = document.getElementById('boot-status');
const runtimeMode = document.getElementById('runtime-mode');
const bootError = document.getElementById('boot-error');
const threadList = document.getElementById('thread-list');
const threadTitle = document.getElementById('thread-title');
const threadSubtitle = document.getElementById('thread-subtitle');
const messageList = document.getElementById('message-list');
const approvalList = document.getElementById('approval-list');
const composerForm = document.getElementById('composer-form');
const promptInput = document.getElementById('prompt-input');
const sendButton = document.getElementById('send-button');
const composerHint = document.getElementById('composer-hint');

const initialSnapshot = {
  bootStatus: 'idle',
  bootError: null,
  uiState: {
    activeThreadId: null,
    activeRunId: null,
    runtimeMode: null,
    supportsHistoryResume: false,
    threadSummaries: [],
    activeThread: null,
    pendingApprovals: [],
    lastError: null,
  },
};

let snapshot = initialSnapshot;
let socket;
let lastThreadId = null;
let lastMessageCount = 0;

const requestJson = async (path, options = {}) => {
  const response = await fetch(`${apiOrigin}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const payload = await response.json();

  if (!response.ok) {
    const message = payload.error ? payload.error : `request failed (${response.status})`;
    throw new Error(message);
  }

  return payload;
};

const discoverApiOrigin = async () => {
  for (let offset = 0; offset < API_PORT_ATTEMPTS; offset += 1) {
    const port = API_PORT_BASE + offset;
    const candidate = `http://${API_HOST}:${port}`;

    try {
      const response = await fetch(`${candidate}/api/state`, {
        method: 'GET',
        headers: {},
      });

      if (response.ok) return candidate;
    } catch (_error) {}
  }

  throw new Error(
    `unable to discover codex api on ports ${API_PORT_BASE}-${API_PORT_BASE + API_PORT_ATTEMPTS - 1}`,
  );
};

const formatUpdatedAt = (timestamp) => {
  if (!timestamp) return 'unknown time';
  const parsed = Date.parse(timestamp);
  if (!Number.isFinite(parsed)) return 'unknown time';

  const relative = Date.now() - parsed;
  const minutes = Math.floor(relative / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(parsed).toLocaleDateString();
};

const formatMessageTime = (timestamp) => {
  if (!timestamp) return '';
  const parsed = Date.parse(timestamp);
  if (!Number.isFinite(parsed)) return '';
  return new Date(parsed).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const createEmptyState = (text) => {
  const empty = document.createElement('p');
  empty.className = 'empty-state';
  empty.textContent = text;
  return empty;
};

const renderThreadList = (nextSnapshot) => {
  threadList.replaceChildren();

  if (nextSnapshot.uiState.threadSummaries.length === 0) {
    threadList.appendChild(createEmptyState('No archived threads yet.'));
    return;
  }

  for (const thread of nextSnapshot.uiState.threadSummaries) {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = thread.isActive ? 'thread-item-button active' : 'thread-item-button';
    button.dataset.threadId = thread.id;

    const title = document.createElement('p');
    title.className = 'thread-title';
    title.textContent = thread.title || thread.id;

    const preview = document.createElement('p');
    preview.className = 'thread-preview';
    preview.textContent = thread.preview || '(no preview)';

    const meta = document.createElement('p');
    meta.className = 'thread-meta';
    meta.textContent = `${thread.source} • ${formatUpdatedAt(thread.updatedAt)}`;

    button.appendChild(title);
    button.appendChild(preview);
    button.appendChild(meta);
    item.appendChild(button);
    threadList.appendChild(item);
  }
};

const renderMessages = (nextSnapshot) => {
  messageList.replaceChildren();
  const activeThread = nextSnapshot.uiState.activeThread;
  if (!activeThread) {
    messageList.appendChild(createEmptyState('Select a thread or start a new one.'));
    return;
  }

  if (activeThread.messages.length === 0) {
    messageList.appendChild(createEmptyState('No messages yet.'));
    return;
  }

  for (const message of activeThread.messages) {
    const row = document.createElement('article');
    row.className = `message-row ${message.role}`;

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    const role = document.createElement('p');
    role.className = 'message-role';
    role.textContent = message.role;

    const body = document.createElement('p');
    body.className = 'message-text';
    body.textContent = message.text || (message.status === 'streaming' ? '...' : '');

    const meta = document.createElement('p');
    meta.className = 'message-meta';
    const timeLabel = formatMessageTime(message.createdAt);
    if (message.status === 'streaming') {
      meta.textContent = timeLabel ? `${timeLabel} • streaming` : 'streaming';
    } else if (message.status === 'error') {
      meta.textContent = timeLabel ? `${timeLabel} • failed` : 'failed';
    } else {
      meta.textContent = timeLabel;
    }

    bubble.appendChild(role);
    bubble.appendChild(body);
    if (meta.textContent) bubble.appendChild(meta);
    row.appendChild(bubble);
    messageList.appendChild(row);
  }
};

const renderApprovals = (nextSnapshot) => {
  approvalList.replaceChildren();
  if (nextSnapshot.uiState.pendingApprovals.length === 0) {
    approvalList.appendChild(createEmptyState('No approvals waiting.'));
    return;
  }

  for (const approval of nextSnapshot.uiState.pendingApprovals) {
    const card = document.createElement('article');
    card.className = 'approval-card';

    const title = document.createElement('p');
    title.className = 'approval-title';
    title.textContent = approval.kind === 'command' ? 'Command approval' : 'File approval';

    const detail = document.createElement('p');
    detail.className = 'approval-detail';
    detail.textContent =
      approval.kind === 'command'
        ? `${approval.command}\n\nReason: ${approval.reason}`
        : `${approval.action} ${approval.filePath}\n\nReason: ${approval.reason}`;

    const actions = document.createElement('div');
    actions.className = 'approval-actions';

    const approve = document.createElement('button');
    approve.type = 'button';
    approve.className = 'approval-button approve';
    approve.dataset.requestId = approval.requestId;
    approve.dataset.decision = 'approve';
    approve.textContent = 'Approve';

    const deny = document.createElement('button');
    deny.type = 'button';
    deny.className = 'approval-button deny';
    deny.dataset.requestId = approval.requestId;
    deny.dataset.decision = 'deny';
    deny.textContent = 'Deny';

    actions.appendChild(approve);
    actions.appendChild(deny);
    card.appendChild(title);
    card.appendChild(detail);
    card.appendChild(actions);
    approvalList.appendChild(card);
  }
};

const applySnapshot = (nextSnapshot) => {
  snapshot = nextSnapshot;

  bootStatus.textContent = nextSnapshot.bootStatus;
  runtimeMode.textContent = nextSnapshot.uiState.runtimeMode
    ? `runtime ${nextSnapshot.uiState.runtimeMode}`
    : 'runtime unknown';
  bootError.textContent = nextSnapshot.bootError || nextSnapshot.uiState.lastError || '';

  renderThreadList(nextSnapshot);
  renderMessages(nextSnapshot);
  renderApprovals(nextSnapshot);

  const activeThread = nextSnapshot.uiState.activeThread;
  if (activeThread) {
    threadTitle.textContent = activeThread.title || activeThread.id;
    threadSubtitle.textContent = `${activeThread.source} • ${activeThread.cwd || 'no cwd'}`;
  } else {
    threadTitle.textContent = 'No thread selected';
    threadSubtitle.textContent = 'Start a new thread to begin';
  }

  const isBusy = Boolean(nextSnapshot.uiState.activeRunId);
  const canSend = nextSnapshot.bootStatus === 'ready' && !isBusy;
  sendButton.disabled = !canSend;
  if (isBusy) {
    composerHint.textContent = 'Codex is responding...';
  } else if (activeThread && activeThread.source === 'history' && !nextSnapshot.uiState.supportsHistoryResume) {
    composerHint.textContent = 'Archived thread selected. Sending creates a continuation thread.';
  } else {
    composerHint.textContent = '';
  }

  const messageCount = activeThread ? activeThread.messages.length : 0;
  if (isBusy || nextSnapshot.uiState.activeThreadId !== lastThreadId || messageCount !== lastMessageCount) {
    messageList.scrollTop = messageList.scrollHeight;
  }

  lastThreadId = nextSnapshot.uiState.activeThreadId;
  lastMessageCount = messageCount;
};

const connectStateSocket = () => {
  const wsUrl = apiOrigin.replace('http://', 'ws://').concat('/api/ws');
  socket = new WebSocket(wsUrl);

  socket.addEventListener('message', (event) => {
    try {
      const packet = JSON.parse(event.data);
      if (packet.type !== 'state') return;
      applySnapshot(packet.snapshot);
    } catch (error) {
      console.error('failed to parse state packet', error);
    }
  });

  socket.addEventListener('close', () => {
    setTimeout(connectStateSocket, 800);
  });
};

const loadState = async () => {
  const payload = await requestJson('/api/state', {
    method: 'GET',
    headers: {},
  });

  applySnapshot(payload);
};

bootButton.addEventListener('click', async () => {
  try {
    const payload = await requestJson('/api/boot', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    applySnapshot(payload);
  } catch (error) {
    bootError.textContent = error instanceof Error ? error.message : String(error);
  }
});

newThreadButton.addEventListener('click', async () => {
  const now = new Date();
  const body = {
    title: `Thread ${now.toLocaleString()}`,
    cwd: snapshot.uiState.activeThread ? snapshot.uiState.activeThread.cwd : undefined,
  };

  try {
    const payload = await requestJson('/api/thread', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    applySnapshot(payload);
  } catch (error) {
    bootError.textContent = error instanceof Error ? error.message : String(error);
  }
});

composerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const prompt = String(promptInput.value || '').trim();
  if (!prompt) return;

  try {
    const payload = await requestJson('/api/prompt', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });

    applySnapshot(payload);
    promptInput.value = '';
  } catch (error) {
    bootError.textContent = error instanceof Error ? error.message : String(error);
  }
});

threadList.addEventListener('click', async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const trigger = target.closest('[data-thread-id]');
  if (!(trigger instanceof HTMLButtonElement)) return;

  const threadId = trigger.dataset.threadId;
  if (!threadId) return;

  try {
    const payload = await requestJson('/api/thread/select', {
      method: 'POST',
      body: JSON.stringify({ threadId }),
    });
    applySnapshot(payload);
  } catch (error) {
    bootError.textContent = error instanceof Error ? error.message : String(error);
  }
});

approvalList.addEventListener('click', async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;

  const requestId = target.dataset.requestId;
  const decision = target.dataset.decision;

  if (!requestId) return;
  if (decision !== 'approve' && decision !== 'deny') return;

  try {
    const payload = await requestJson('/api/approval', {
      method: 'POST',
      body: JSON.stringify({ requestId, decision }),
    });

    applySnapshot(payload);
  } catch (error) {
    bootError.textContent = error instanceof Error ? error.message : String(error);
  }
});

const initialize = async () => {
  if (!hasPreloadApiOrigin) {
    apiOrigin = await discoverApiOrigin();
  }

  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      await loadState();
      connectStateSocket();
      return;
    } catch (error) {
      bootError.textContent = error instanceof Error ? error.message : String(error);
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
};

await initialize();
