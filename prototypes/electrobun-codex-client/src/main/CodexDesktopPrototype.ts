import { AppServerSupervisor } from './AppServerSupervisor';
import { CodexAppServerClient } from './CodexAppServerClient';
import type { StreamEvent } from '../shared/protocol';

type UiState = {
  threadId: string | null;
  activeRunId: string | null;
  transcript: string;
  pendingApprovals: Array<
    | { kind: 'command'; requestId: string; command: string; reason: string }
    | { kind: 'file'; requestId: string; filePath: string; action: 'read' | 'write' | 'delete'; reason: string }
  >;
  lastError: string | null;
};

export class CodexDesktopPrototype {
  private readonly supervisor: AppServerSupervisor;
  private client: CodexAppServerClient | null = null;
  private uiState: UiState = {
    threadId: null,
    activeRunId: null,
    transcript: '',
    pendingApprovals: [],
    lastError: null,
  };

  constructor() {
    this.supervisor = new AppServerSupervisor();
    this.supervisor.onRestarting(() => {
      this.uiState.lastError = 'codex app server restarted, reconnecting';
    });
    this.supervisor.onFailed((error) => {
      this.uiState.lastError = error.message;
    });
  }

  getState(): UiState {
    return this.uiState;
  }

  async boot(): Promise<void> {
    await this.supervisor.start();

    this.client = new CodexAppServerClient(this.supervisor.stdioProcess);
    this.client.onStream((event) => {
      this.applyStreamEvent(event);
    });
    this.client.onTransportError((error) => {
      this.uiState.lastError = error.message;
    });

    await this.client.health();
  }

  async startThread(title: string, cwd: string): Promise<void> {
    if (!this.client) throw new Error('client is not initialized');

    const threadId = await this.client.startThread({ title, cwd });
    this.uiState.threadId = threadId;
    this.uiState.lastError = null;
  }

  async submitPrompt(prompt: string): Promise<void> {
    if (!this.client) throw new Error('client is not initialized');
    if (!this.uiState.threadId) throw new Error('start thread before prompt');

    const runId = await this.client.runStart({ threadId: this.uiState.threadId, prompt });
    this.uiState.activeRunId = runId;
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
  }

  async shutdown(): Promise<void> {
    await this.supervisor.shutdown();
  }

  private applyStreamEvent(event: StreamEvent): void {
    if (event.type === 'output.delta') {
      this.uiState.transcript = this.uiState.transcript.concat(event.text);
      return;
    }

    if (event.type === 'approval.command.required') {
      this.uiState.pendingApprovals = this.uiState.pendingApprovals.concat({ kind: 'command', ...event.payload });
      return;
    }

    if (event.type === 'approval.file.required') {
      this.uiState.pendingApprovals = this.uiState.pendingApprovals.concat({ kind: 'file', ...event.payload });
      return;
    }

    if (event.type === 'run.completed') {
      this.uiState.activeRunId = null;
      return;
    }

    if (event.type === 'run.failed') {
      this.uiState.activeRunId = null;
      this.uiState.lastError = event.message;
    }
  }
}
