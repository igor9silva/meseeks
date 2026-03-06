import { basename } from 'node:path';
import { AppServerSupervisor, type CodexRuntimeMode } from './AppServerSupervisor';
import { CodexAppServerClient } from './CodexAppServerClient';
import type { StreamEvent } from '../shared/protocol';
import { CodexSessionArchive } from './CodexSessionArchive';

type ThreadSource = 'history' | 'live';
type MessageStatus = 'done' | 'streaming' | 'error';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  createdAt: string | null;
  status: MessageStatus;
};

export type ThreadSummary = {
  id: string;
  title: string;
  preview: string;
  cwd: string;
  updatedAt: string | null;
  source: ThreadSource;
  isActive: boolean;
};

export type ActiveThread = {
  id: string;
  title: string;
  cwd: string;
  source: ThreadSource;
  messages: ChatMessage[];
};

type PendingApproval =
  | { kind: 'command'; runId: string; requestId: string; command: string; reason: string }
  | { kind: 'file'; runId: string; requestId: string; filePath: string; action: 'read' | 'write' | 'delete'; reason: string };

type ThreadRecord = {
  id: string;
  title: string;
  preview: string;
  cwd: string;
  updatedAt: string | null;
  source: ThreadSource;
};

type RunBinding = {
  threadId: string;
  assistantMessageId: string;
};

export type UiState = {
  activeThreadId: string | null;
  activeRunId: string | null;
  runtimeMode: CodexRuntimeMode | null;
  supportsHistoryResume: boolean;
  threadSummaries: ThreadSummary[];
  activeThread: ActiveThread | null;
  pendingApprovals: PendingApproval[];
  lastError: string | null;
};

const toDateValue = (timestamp: string | null): number => {
  if (!timestamp) return 0;
  const parsed = Date.parse(timestamp);
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

export class CodexDesktopPrototype {
  private readonly supervisor: AppServerSupervisor;
  private readonly archive: CodexSessionArchive;
  private client: CodexAppServerClient | null = null;
  private readonly stateListeners = new Set<(state: UiState) => void>();
  private readonly threadRecords = new Map<string, ThreadRecord>();
  private readonly threadMessages = new Map<string, ChatMessage[]>();
  private readonly loadedHistoryThreadIds = new Set<string>();
  private readonly runBindings = new Map<string, RunBinding>();
  private messageCounter = 0;
  private liveThreadId: string | null = null;
  private uiState: UiState = {
    activeThreadId: null,
    activeRunId: null,
    runtimeMode: null,
    supportsHistoryResume: false,
    threadSummaries: [],
    activeThread: null,
    pendingApprovals: [],
    lastError: null,
  };

  constructor() {
    this.supervisor = new AppServerSupervisor();
    this.archive = new CodexSessionArchive();
    this.supervisor.onRestarting(() => {
      this.uiState.lastError = 'codex app server restarted, reconnecting';
      this.emitState();
    });
    this.supervisor.onFailed((error) => {
      this.uiState.lastError = error.message;
      this.emitState();
    });
  }

  getState(): UiState {
    return {
      ...this.uiState,
      threadSummaries: this.uiState.threadSummaries.slice(),
      activeThread: this.uiState.activeThread
        ? {
            ...this.uiState.activeThread,
            messages: this.uiState.activeThread.messages.slice(),
          }
        : null,
      pendingApprovals: this.uiState.pendingApprovals.slice(),
    };
  }

  onStateChange(listener: (state: UiState) => void): () => void {
    this.stateListeners.add(listener);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  async boot(): Promise<void> {
    await this.supervisor.start();
    this.uiState.runtimeMode = this.supervisor.runtimeMode;
    this.uiState.supportsHistoryResume = false;

    this.client = new CodexAppServerClient(this.supervisor.stdioProcess, this.supervisor.runtimeMode);
    this.client.onStream((event) => {
      this.applyStreamEvent(event);
    });
    this.client.onTransportError((error) => {
      this.uiState.lastError = error.message;
      this.emitState();
    });

    await this.client.health();
    await this.loadArchivedThreads();
    this.recomputeThreadViews();

    if (!this.uiState.activeThreadId && this.uiState.threadSummaries.length > 0) {
      this.uiState.activeThreadId = this.uiState.threadSummaries[0].id;
      await this.ensureHistoryThreadLoaded(this.uiState.activeThreadId);
    }

    this.emitState();
  }

  async startThread(title: string, cwd: string): Promise<void> {
    if (!this.client) throw new Error('client is not initialized');

    const threadId = await this.client.startThread({ title, cwd });
    this.liveThreadId = threadId;
    const normalizedTitle = title.trim() || deriveThreadTitle(cwd, threadId);
    this.threadRecords.set(threadId, {
      id: threadId,
      title: normalizedTitle,
      preview: '',
      cwd,
      updatedAt: new Date().toISOString(),
      source: 'live',
    });

    if (!this.threadMessages.has(threadId)) {
      this.threadMessages.set(threadId, []);
    }

    this.uiState.activeThreadId = threadId;
    this.uiState.lastError = null;
    this.emitState();
  }

  async selectThread(threadId: string): Promise<void> {
    const record = this.threadRecords.get(threadId);
    if (!record) throw new Error(`unknown thread id ${threadId}`);

    this.uiState.activeThreadId = threadId;
    if (record.source === 'history') {
      await this.ensureHistoryThreadLoaded(threadId);
    }
    this.emitState();
  }

  async submitPrompt(prompt: string): Promise<void> {
    if (!this.client) throw new Error('client is not initialized');
    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt) throw new Error('prompt cannot be empty');

    let threadId = this.uiState.activeThreadId;
    let activeRecord = threadId ? this.threadRecords.get(threadId) : null;
    const previousHistoryThreadId =
      activeRecord && activeRecord.source === 'history' ? activeRecord.id : null;
    if (!activeRecord || activeRecord.source === 'history') {
      const nextCwd = activeRecord?.cwd || process.cwd();
      const nextTitle = activeRecord ? `Continuation ${activeRecord.id.slice(0, 8)}` : 'Codex thread';
      await this.startThread(nextTitle, nextCwd);
      threadId = this.uiState.activeThreadId;
      activeRecord = threadId ? this.threadRecords.get(threadId) : null;
      if (threadId && previousHistoryThreadId) {
        this.pushMessage(
          threadId,
          'system',
          `Continued from archived thread ${previousHistoryThreadId}.`,
          'done',
        );
      }
    }

    if (!threadId) throw new Error('start thread before prompt');

    this.pushMessage(threadId, 'user', normalizedPrompt, 'done');

    try {
      const runId = await this.client.runStart({ threadId, prompt: normalizedPrompt });
      const assistantMessageId = this.pushMessage(threadId, 'assistant', '', 'streaming');
      this.runBindings.set(runId, { threadId, assistantMessageId });
      this.uiState.activeRunId = runId;
      this.uiState.lastError = null;
      this.touchThread(threadId);
    } catch (error) {
      this.uiState.lastError = toErrorMessage(error);
      this.touchThread(threadId);
      this.emitState();
      throw error;
    }

    this.emitState();
  }

  async respondApproval(requestId: string, decision: 'approve' | 'deny'): Promise<void> {
    if (!this.client) throw new Error('client is not initialized');

    const approval = this.uiState.pendingApprovals.find((item) => item.requestId === requestId);
    if (!approval) return;

    if (approval.kind === 'command') {
      await this.client.sendCommandApproval(requestId, decision);
    }

    if (approval.kind === 'file') {
      await this.client.sendFileApproval(requestId, decision);
    }

    this.uiState.pendingApprovals = this.uiState.pendingApprovals.filter((item) => item.requestId !== requestId);
    this.emitState();
  }

  async shutdown(): Promise<void> {
    await this.supervisor.shutdown();
  }

  private applyStreamEvent(event: StreamEvent): void {
    if (event.type === 'output.delta') {
      const binding = this.ensureRunBinding(event.runId);
      if (!binding) return;

      this.appendMessageText(binding.threadId, binding.assistantMessageId, event.text);
      this.touchThread(binding.threadId);
      this.emitState();
      return;
    }

    if (event.type === 'approval.command.required') {
      this.uiState.pendingApprovals = this.uiState.pendingApprovals.concat({
        kind: 'command',
        runId: event.runId,
        ...event.payload,
      });
      this.emitState();
      return;
    }

    if (event.type === 'approval.file.required') {
      this.uiState.pendingApprovals = this.uiState.pendingApprovals.concat({
        kind: 'file',
        runId: event.runId,
        ...event.payload,
      });
      this.emitState();
      return;
    }

    if (event.type === 'run.completed') {
      const binding = this.runBindings.get(event.runId);
      if (binding) {
        this.updateMessageStatus(binding.threadId, binding.assistantMessageId, 'done');
        this.touchThread(binding.threadId);
        this.runBindings.delete(event.runId);
      }

      this.uiState.activeRunId = null;
      this.emitState();
      return;
    }

    if (event.type === 'run.failed') {
      const binding = this.runBindings.get(event.runId);
      if (binding) {
        this.updateMessageStatus(binding.threadId, binding.assistantMessageId, 'error');
        this.touchThread(binding.threadId);
        this.runBindings.delete(event.runId);
      }

      this.uiState.activeRunId = null;
      this.uiState.lastError = event.message;
      this.emitState();
    }
  }

  private async loadArchivedThreads(): Promise<void> {
    const archived = await this.archive.listThreadSummaries();
    for (const summary of archived) {
      const existing = this.threadRecords.get(summary.id);
      if (existing && existing.source === 'live') continue;

      this.threadRecords.set(summary.id, {
        id: summary.id,
        title: summary.title,
        preview: summary.preview,
        cwd: summary.cwd,
        updatedAt: summary.updatedAt,
        source: 'history',
      });
    }
  }

  private async ensureHistoryThreadLoaded(threadId: string): Promise<void> {
    if (this.loadedHistoryThreadIds.has(threadId)) return;

    const record = this.threadRecords.get(threadId);
    if (!record || record.source !== 'history') return;

    const archivedThread = await this.archive.readThread(threadId);
    if (!archivedThread) return;

    const messages = archivedThread.messages.map((message) => ({
      id: message.id,
      role: message.role,
      text: message.text,
      createdAt: message.createdAt,
      status: 'done',
    } satisfies ChatMessage));
    this.threadMessages.set(threadId, messages);
    this.threadRecords.set(threadId, {
      ...record,
      title: archivedThread.summary.title,
      preview: archivedThread.summary.preview,
      cwd: archivedThread.summary.cwd,
      updatedAt: archivedThread.summary.updatedAt,
    });
    this.loadedHistoryThreadIds.add(threadId);
  }

  private ensureRunBinding(runId: string): RunBinding | null {
    const existing = this.runBindings.get(runId);
    if (existing) return existing;

    const fallbackThreadId = this.liveThreadId ?? this.uiState.activeThreadId;
    if (!fallbackThreadId) return null;

    const assistantMessageId = this.pushMessage(fallbackThreadId, 'assistant', '', 'streaming');
    const binding = { threadId: fallbackThreadId, assistantMessageId };
    this.runBindings.set(runId, binding);
    return binding;
  }

  private pushMessage(
    threadId: string,
    role: ChatMessage['role'],
    text: string,
    status: MessageStatus,
  ): string {
    const id = `message-${this.nextMessageNumber()}`;
    const messages = this.ensureThreadMessages(threadId);
    messages.push({
      id,
      role,
      text,
      createdAt: new Date().toISOString(),
      status,
    });

    if (role === 'user') {
      this.updateThreadPreview(threadId, text);
    }

    return id;
  }

  private appendMessageText(threadId: string, messageId: string, delta: string): void {
    const messages = this.ensureThreadMessages(threadId);
    const target = messages.find((message) => message.id === messageId);
    if (!target) return;
    target.text = target.text.concat(delta);
  }

  private updateMessageStatus(threadId: string, messageId: string, status: MessageStatus): void {
    const messages = this.ensureThreadMessages(threadId);
    const target = messages.find((message) => message.id === messageId);
    if (!target) return;
    target.status = status;
  }

  private ensureThreadMessages(threadId: string): ChatMessage[] {
    const existing = this.threadMessages.get(threadId);
    if (existing) return existing;

    const created: ChatMessage[] = [];
    this.threadMessages.set(threadId, created);
    return created;
  }

  private nextMessageNumber(): number {
    this.messageCounter += 1;
    return this.messageCounter;
  }

  private updateThreadPreview(threadId: string, text: string): void {
    const record = this.threadRecords.get(threadId);
    if (!record) return;
    const compact = text.replace(/\s+/g, ' ').trim();
    record.preview = compact.length > 140 ? compact.slice(0, 137).concat('...') : compact;
  }

  private touchThread(threadId: string): void {
    const record = this.threadRecords.get(threadId);
    if (!record) return;
    record.updatedAt = new Date().toISOString();
  }

  private recomputeThreadViews(): void {
    const records = Array.from(this.threadRecords.values());
    records.sort((left, right) => toDateValue(right.updatedAt) - toDateValue(left.updatedAt));

    const summaries: ThreadSummary[] = records.map((record) => ({
      id: record.id,
      title: record.title,
      preview: record.preview,
      cwd: record.cwd,
      updatedAt: record.updatedAt,
      source: record.source,
      isActive: record.id === this.uiState.activeThreadId,
    }));
    this.uiState.threadSummaries = summaries;

    const activeId = this.uiState.activeThreadId;
    const activeRecord = activeId ? this.threadRecords.get(activeId) : null;
    const activeMessages = activeId ? this.threadMessages.get(activeId) ?? [] : [];
    this.uiState.activeThread = activeRecord
      ? {
          id: activeRecord.id,
          title: activeRecord.title,
          cwd: activeRecord.cwd,
          source: activeRecord.source,
          messages: activeMessages,
        }
      : null;
  }

  private emitState(): void {
    this.recomputeThreadViews();
    const nextState = this.getState();
    for (const listener of this.stateListeners) listener(nextState);
  }
}

const deriveThreadTitle = (cwd: string, threadId: string): string => {
  const name = basename(cwd.trim());
  if (name) return name;
  return `Thread ${threadId.slice(0, 8)}`;
};
