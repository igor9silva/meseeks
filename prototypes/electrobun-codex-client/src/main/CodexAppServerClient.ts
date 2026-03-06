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

export class CodexAppServerClient {
  private readonly process: ChildProcessWithoutNullStreams;
  private nextId: JsonRpcId = 1;
  private readonly pending = new Map<JsonRpcId, { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }>();
  private readBuffer = '';
  private readonly streamListeners = new Set<(event: StreamEvent) => void>();
  private readonly transportErrorListeners = new Set<(error: Error) => void>();

  constructor(process: ChildProcessWithoutNullStreams) {
    this.process = process;
    this.process.stdout.on('data', (chunk: Buffer) => {
      this.handleChunk(chunk.toString('utf8'));
    });
    this.process.stderr.on('data', (chunk: Buffer) => {
      this.emitTransportError(new Error(`app-server stderr: ${chunk.toString('utf8')}`));
    });
  }


  onStream(listener: (event: StreamEvent) => void): void {
    this.streamListeners.add(listener);
  }

  onTransportError(listener: (error: Error) => void): void {
    this.transportErrorListeners.add(listener);
  }

  async health(): Promise<void> {
    const result = await this.request('health.check', {});
    healthResponseSchema.parse(result);
  }

  async startThread(params: { cwd: string; title: string }): Promise<string> {
    const safeParams = threadStartParamsSchema.parse(params);
    const result = await this.request('thread.start', safeParams);
    const parsed = threadStartResponseSchema.parse(result);
    return parsed.threadId;
  }

  async runStart(params: { threadId: string; prompt: string }): Promise<string> {
    const safeParams = runStartParamsSchema.parse(params);
    const result = await this.request('run.start', safeParams);
    const parsed = runStartResponseSchema.parse(result);
    return parsed.runId;
  }

  async sendCommandApproval(requestId: string, decision: ApprovalDecision): Promise<void> {
    const safeDecision = approvalDecisionSchema.parse(decision);
    await this.request('approval.command.respond', { requestId, decision: safeDecision });
  }

  async sendFileApproval(requestId: string, decision: ApprovalDecision): Promise<void> {
    const safeDecision = approvalDecisionSchema.parse(decision);
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

  private handleEvent(packet: unknown): void {
    const parsed = streamEventSchema.safeParse(packet);

    if (!parsed.success) {
      this.emitTransportError(new Error(parsed.error.message));
      return;
    }

    for (const listener of this.streamListeners) listener(parsed.data);
  }
}
