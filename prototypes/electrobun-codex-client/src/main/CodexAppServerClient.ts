import { ChildProcessWithoutNullStreams } from 'node:child_process';
import { z } from 'zod';
import {
  approvalDecisionSchema,
  healthResponseSchema,
  runStartParamsSchema,
  runStartResponseSchema,
  streamEventSchema,
  threadStartParamsSchema,
  threadStartResponseSchema,
  type ApprovalDecision,
  type StreamEvent,
} from '../shared/protocol';
import type { CodexRuntimeMode } from './AppServerSupervisor';

type JsonRpcId = number;

const jsonRpcResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.number().int(),
  result: z.unknown().optional(),
  error: z
    .object({
      code: z.number(),
      message: z.string(),
    })
    .optional(),
});

const protoPacketSchema = z.object({
  id: z.string(),
  msg: z.object({ type: z.string() }).passthrough(),
});

const protoSessionConfiguredSchema = z.object({
  type: z.literal('session_configured'),
  session_id: z.string().min(1),
});

const protoErrorSchema = z.object({
  type: z.literal('error'),
  message: z.string().min(1),
});

const protoAgentMessageDeltaSchema = z.object({
  type: z.literal('agent_message_delta'),
  delta: z.string(),
});

const protoAgentMessageSchema = z.object({
  type: z.literal('agent_message'),
  message: z.string(),
});

const protoTaskCompleteSchema = z.object({
  type: z.literal('task_complete'),
});

const protoExecApprovalRequestSchema = z.object({
  type: z.literal('exec_approval_request'),
  call_id: z.string().min(1),
  command: z.array(z.string()),
  reason: z.string().optional(),
});

const protoPatchApprovalRequestSchema = z.object({
  type: z.literal('patch_approval_request'),
  call_id: z.string().min(1),
  reason: z.string().optional(),
  file_path: z.string().optional(),
});

export class CodexAppServerClient {
  private readonly process: ChildProcessWithoutNullStreams;
  private readonly mode: CodexRuntimeMode;
  private nextId: JsonRpcId = 1;
  private readonly pending = new Map<JsonRpcId, { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }>();
  private readBuffer = '';
  private readonly streamListeners = new Set<(event: StreamEvent) => void>();
  private readonly transportErrorListeners = new Set<(error: Error) => void>();
  private readonly sessionConfiguredListeners = new Set<() => void>();
  private isSessionConfigured = false;
  private sessionId: string | null = null;
  private threadId: string | null = null;
  private readonly protoRunHasDelta = new Set<string>();

  constructor(process: ChildProcessWithoutNullStreams, mode: CodexRuntimeMode = 'app-server') {
    this.process = process;
    this.mode = mode;
    this.process.stdout.on('data', (chunk: Buffer) => {
      this.handleChunk(chunk.toString('utf8'));
    });
    this.process.stderr.on('data', (chunk: Buffer) => {
      this.handleStderr(chunk.toString('utf8'));
    });
  }


  onStream(listener: (event: StreamEvent) => void): void {
    this.streamListeners.add(listener);
  }

  onTransportError(listener: (error: Error) => void): void {
    this.transportErrorListeners.add(listener);
  }

  async health(): Promise<void> {
    if (this.mode === 'proto') {
      if (this.isSessionConfigured) return;
      await this.waitForSessionConfigured();
      return;
    }

    const result = await this.request('health.check', {});
    healthResponseSchema.parse(result);
  }

  async startThread(params: { cwd: string; title: string }): Promise<string> {
    const safeParams = threadStartParamsSchema.parse(params);
    if (this.mode === 'proto') {
      if (!this.threadId) {
        const suffix = this.sessionId ?? this.createProtoRequestId('thread');
        this.threadId = `thread-${suffix}`;
      }

      return this.threadId;
    }

    const result = await this.request('thread.start', safeParams);
    const parsed = threadStartResponseSchema.parse(result);
    return parsed.threadId;
  }

  async runStart(params: { threadId: string; prompt: string }): Promise<string> {
    const safeParams = runStartParamsSchema.parse(params);
    if (this.mode === 'proto') {
      if (this.threadId && safeParams.threadId !== this.threadId) {
        throw new Error(`unknown thread id ${safeParams.threadId}`);
      }

      const runId = this.createProtoRequestId('run');
      this.writeProto(runId, {
        type: 'user_input',
        items: [{ type: 'text', text: safeParams.prompt }],
      });
      return runId;
    }

    const result = await this.request('run.start', safeParams);
    const parsed = runStartResponseSchema.parse(result);
    return parsed.runId;
  }

  async sendCommandApproval(requestId: string, decision: ApprovalDecision): Promise<void> {
    const safeDecision = approvalDecisionSchema.parse(decision);
    if (this.mode === 'proto') {
      const approvalId = this.createProtoRequestId('exec-approval');
      this.writeProto(approvalId, {
        type: 'exec_approval',
        id: requestId,
        decision: safeDecision === 'approve' ? 'approved' : 'denied',
      });
      return;
    }

    await this.request('approval.command.respond', { requestId, decision: safeDecision });
  }

  async sendFileApproval(requestId: string, decision: ApprovalDecision): Promise<void> {
    const safeDecision = approvalDecisionSchema.parse(decision);
    if (this.mode === 'proto') {
      const approvalId = this.createProtoRequestId('patch-approval');
      this.writeProto(approvalId, {
        type: 'patch_approval',
        id: requestId,
        decision: safeDecision === 'approve' ? 'approved' : 'denied',
      });
      return;
    }

    await this.request('approval.file.respond', { requestId, decision: safeDecision });
  }

  private request(method: string, params: unknown): Promise<unknown> {
    const id = this.nextId;
    this.nextId += 1;

    const payload = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.process.stdin.write(`${JSON.stringify(payload)}\n`);
    });
  }

  private handleChunk(chunk: string): void {
    this.readBuffer = this.readBuffer.concat(chunk);

    while (true) {
      const newlineIndex = this.readBuffer.indexOf('\n');
      if (newlineIndex < 0) return;

      const line = this.readBuffer.slice(0, newlineIndex).trim();
      this.readBuffer = this.readBuffer.slice(newlineIndex + 1);

      if (!line) continue;

      this.handleLine(line);
    }
  }

  private handleLine(line: string): void {
    try {
      const packet = JSON.parse(line);
      if (!packet || typeof packet !== 'object') return;

      if (this.mode === 'proto') {
        this.handleProtoPacket(packet);
        return;
      }

      const isResponse = 'id' in packet && 'jsonrpc' in packet;
      if (isResponse) {
        this.handleResponse(packet);
        return;
      }

      this.handleEvent(packet);
    } catch (error) {
      const parseError = error instanceof Error ? error : new Error(String(error));
      this.emitTransportError(parseError);
    }
  }

  private handleResponse(packet: unknown): void {
    const parsed = jsonRpcResponseSchema.safeParse(packet);
    if (!parsed.success) {
      this.emitTransportError(new Error(parsed.error.message));
      return;
    }

    const resolver = this.pending.get(parsed.data.id);
    if (!resolver) return;

    this.pending.delete(parsed.data.id);

    if (parsed.data.error) {
      resolver.reject(new Error(parsed.data.error.message));
      return;
    }

    resolver.resolve(parsed.data.result);
  }

  private emitTransportError(error: Error): void {
    for (const listener of this.transportErrorListeners) listener(error);
  }

  private emitStream(event: StreamEvent): void {
    for (const listener of this.streamListeners) listener(event);
  }

  private emitSessionConfigured(): void {
    for (const listener of this.sessionConfiguredListeners) listener();
    this.sessionConfiguredListeners.clear();
  }

  private async waitForSessionConfigured(): Promise<void> {
    if (this.isSessionConfigured) return;

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.sessionConfiguredListeners.delete(handleConfigured);
        reject(new Error('timed out waiting for codex proto session configuration'));
      }, 30000);

      const handleConfigured = (): void => {
        clearTimeout(timeout);
        this.sessionConfiguredListeners.delete(handleConfigured);
        resolve();
      };

      this.sessionConfiguredListeners.add(handleConfigured);
    });
  }

  private createProtoRequestId(prefix: string): string {
    const next = this.nextId;
    this.nextId += 1;
    return `${prefix}-${next}`;
  }

  private writeProto(id: string, op: unknown): void {
    const payload = { id, op };
    this.process.stdin.write(`${JSON.stringify(payload)}\n`);
  }

  private handleStderr(stderr: string): void {
    if (this.mode === 'app-server') {
      this.emitTransportError(new Error(`app-server stderr: ${stderr}`));
      return;
    }

    if (stderr.includes('ERROR codex_cli::proto')) {
      this.emitTransportError(new Error(`codex proto stderr: ${stderr.trim()}`));
    }
  }

  private handleProtoPacket(packet: unknown): void {
    const parsed = protoPacketSchema.safeParse(packet);
    if (!parsed.success) {
      this.emitTransportError(new Error(parsed.error.message));
      return;
    }

    const runId = parsed.data.id;
    const message = parsed.data.msg;

    const configured = protoSessionConfiguredSchema.safeParse(message);
    if (configured.success) {
      this.isSessionConfigured = true;
      this.sessionId = configured.data.session_id;
      this.emitSessionConfigured();
      return;
    }

    const protoError = protoErrorSchema.safeParse(message);
    if (protoError.success) {
      if (!runId) return;

      this.protoRunHasDelta.delete(runId);
      this.emitStream({ type: 'run.failed', runId, message: protoError.data.message });
      return;
    }

    const messageDelta = protoAgentMessageDeltaSchema.safeParse(message);
    if (messageDelta.success) {
      if (!runId) return;

      this.protoRunHasDelta.add(runId);
      this.emitStream({ type: 'output.delta', runId, text: messageDelta.data.delta });
      return;
    }

    const agentMessage = protoAgentMessageSchema.safeParse(message);
    if (agentMessage.success) {
      if (!runId) return;
      if (this.protoRunHasDelta.has(runId)) return;

      this.emitStream({ type: 'output.delta', runId, text: agentMessage.data.message });
      return;
    }

    const commandApproval = protoExecApprovalRequestSchema.safeParse(message);
    if (commandApproval.success) {
      if (!runId) return;

      this.emitStream({
        type: 'approval.command.required',
        runId,
        payload: {
          requestId: commandApproval.data.call_id,
          command: commandApproval.data.command.join(' '),
          reason: commandApproval.data.reason ?? 'command requires approval',
        },
      });
      return;
    }

    const fileApproval = protoPatchApprovalRequestSchema.safeParse(message);
    if (fileApproval.success) {
      if (!runId) return;

      this.emitStream({
        type: 'approval.file.required',
        runId,
        payload: {
          requestId: fileApproval.data.call_id,
          filePath: fileApproval.data.file_path ?? 'workspace patch',
          action: 'write',
          reason: fileApproval.data.reason ?? 'file write requires approval',
        },
      });
      return;
    }

    const taskComplete = protoTaskCompleteSchema.safeParse(message);
    if (taskComplete.success) {
      if (!runId) return;
      this.protoRunHasDelta.delete(runId);
      this.emitStream({ type: 'run.completed', runId });
    }
  }

  private handleEvent(packet: unknown): void {
    const parsed = streamEventSchema.safeParse(packet);

    if (!parsed.success) {
      this.emitTransportError(new Error(parsed.error.message));
      return;
    }

    this.emitStream(parsed.data);
  }
}
