import { createReadStream, type Dirent } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';
import { createInterface } from 'node:readline';
import { z } from 'zod';

export type ArchivedMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string | null;
};

export type ArchivedThreadSummary = {
  id: string;
  title: string;
  preview: string;
  cwd: string;
  updatedAt: string | null;
  filePath: string;
};

export type ArchivedThread = {
  summary: ArchivedThreadSummary;
  messages: ArchivedMessage[];
};

const rolloutFileNamePattern = /^rollout-.*\.jsonl$/;
const requestMarker = '## My request for Codex:';

const lineEnvelopeSchema = z.object({
  type: z.string(),
  timestamp: z.string().optional(),
  payload: z.unknown().optional(),
});

const sessionMetaLineSchema = z.object({
  type: z.literal('session_meta'),
  timestamp: z.string().optional(),
  payload: z.object({
    id: z.string().min(1),
    timestamp: z.string().optional(),
    cwd: z.string().optional(),
  }),
});

const responseMessageContentSchema = z.object({
  type: z.string(),
  text: z.string().optional(),
});

const responseMessageLineSchema = z.object({
  type: z.literal('response_item'),
  timestamp: z.string().optional(),
  payload: z.object({
    type: z.literal('message'),
    role: z.enum(['user', 'assistant', 'developer', 'system']),
    content: z.array(responseMessageContentSchema),
  }),
});

const eventMessageLineSchema = z.object({
  type: z.literal('event_msg'),
  timestamp: z.string().optional(),
  payload: z.object({
    type: z.string(),
    message: z.string().optional(),
    last_agent_message: z.string().nullable().optional(),
  }),
});

const toDateValue = (value: string | null): number => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
};

const parseJsonLine = (line: string): unknown | null => {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
};

const toEnvelope = (line: string): z.infer<typeof lineEnvelopeSchema> | null => {
  const parsed = parseJsonLine(line);
  if (!parsed) return null;
  const envelope = lineEnvelopeSchema.safeParse(parsed);
  if (!envelope.success) return null;
  return envelope.data;
};

const extractTextFromResponseContent = (content: z.infer<typeof responseMessageContentSchema>[]): string => {
  const chunks: string[] = [];
  for (const item of content) {
    if (!item.text) continue;
    if (item.type !== 'input_text' && item.type !== 'output_text' && item.type !== 'text') continue;
    chunks.push(item.text);
  }

  return chunks.join('\n').trim();
};

const normalizeUserText = (raw: string): string => {
  if (!raw.trim()) return '';

  let normalized = raw.trim();
  if (normalized.includes(requestMarker)) {
    const parts = normalized.split(requestMarker);
    normalized = parts.slice(1).join(requestMarker).trim();
  }

  const lowered = normalized.toLowerCase();
  if (lowered.includes('<environment_context>')) return '';
  if (lowered.includes('<turn_aborted>')) return '';
  if (lowered.startsWith('# agents.md instructions')) return '';
  if (lowered.includes('# agents.md instructions for ')) return '';

  return normalized.trim();
};

const compactPreview = (raw: string): string => {
  const singleLine = raw.replace(/\s+/g, ' ').trim();
  if (!singleLine) return '';
  if (singleLine.length <= 140) return singleLine;
  return singleLine.slice(0, 137).concat('...');
};

const deriveThreadTitle = (preview: string, cwd: string, threadId: string): string => {
  if (preview) return compactPreview(preview);

  const cwdBase = basename(cwd.trim());
  if (cwdBase) return cwdBase;
  return `Thread ${threadId.slice(0, 8)}`;
};

const dedupeAdjacentMessages = (messages: ArchivedMessage[]): ArchivedMessage[] => {
  if (messages.length < 2) return messages;

  const deduped: ArchivedMessage[] = [messages[0]];
  for (let index = 1; index < messages.length; index += 1) {
    const current = messages[index];
    const previous = deduped[deduped.length - 1];
    if (previous.role === current.role && previous.text === current.text) continue;
    deduped.push(current);
  }

  return deduped;
};

export class CodexSessionArchive {
  private readonly archiveDir: string;
  private summaryCache: ArchivedThreadSummary[] | null = null;
  private readonly filePathByThreadId = new Map<string, string>();

  constructor(codexHome = resolveCodexHome()) {
    this.archiveDir = join(codexHome, 'archived_sessions');
  }

  clearCache(): void {
    this.summaryCache = null;
    this.filePathByThreadId.clear();
  }

  async listThreadSummaries(): Promise<ArchivedThreadSummary[]> {
    if (this.summaryCache) return this.summaryCache.slice();

    const summaries = await this.readAllSummaries();
    summaries.sort((left, right) => toDateValue(right.updatedAt) - toDateValue(left.updatedAt));

    this.summaryCache = summaries;
    this.filePathByThreadId.clear();
    for (const summary of summaries) {
      this.filePathByThreadId.set(summary.id, summary.filePath);
    }

    return summaries.slice();
  }

  async readThread(threadId: string): Promise<ArchivedThread | null> {
    const summaries = await this.listThreadSummaries();
    const summary = summaries.find((item) => item.id === threadId);
    if (!summary) return null;

    const messages = await this.readThreadMessages(summary.filePath);
    return { summary, messages };
  }

  private async readAllSummaries(): Promise<ArchivedThreadSummary[]> {
    let entries: Dirent[];
    try {
      entries = await readdir(this.archiveDir, { withFileTypes: true });
    } catch {
      return [];
    }

    const filePaths: string[] = [];
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!rolloutFileNamePattern.test(entry.name)) continue;
      filePaths.push(join(this.archiveDir, entry.name));
    }

    const maybeSummaries = await Promise.all(filePaths.map((filePath) => this.readSummary(filePath)));
    const summaries: ArchivedThreadSummary[] = [];
    for (const summary of maybeSummaries) {
      if (!summary) continue;
      summaries.push(summary);
    }

    return summaries;
  }

  private async readSummary(filePath: string): Promise<ArchivedThreadSummary | null> {
    let stats: Awaited<ReturnType<typeof stat>>;
    try {
      stats = await stat(filePath);
    } catch {
      return null;
    }

    let threadId = '';
    let cwd = '';
    let metaTimestamp: string | null = null;
    let preview = '';
    let linesRead = 0;

    const stream = createReadStream(filePath, { encoding: 'utf8' });
    const reader = createInterface({ input: stream, crlfDelay: Infinity });
    try {
      for await (const line of reader) {
        linesRead += 1;
        const envelope = toEnvelope(line);
        if (!envelope) continue;

        if (!threadId) {
          const parsedMeta = sessionMetaLineSchema.safeParse(envelope);
          if (parsedMeta.success) {
            threadId = parsedMeta.data.payload.id;
            cwd = parsedMeta.data.payload.cwd ?? '';
            metaTimestamp = parsedMeta.data.payload.timestamp ?? parsedMeta.data.timestamp ?? null;
          }
        }

        if (!preview) {
          const candidate = this.extractPreviewCandidate(envelope);
          if (candidate) preview = candidate;
        }

        if (threadId && preview) break;
        if (threadId && linesRead >= 260) break;
      }
    } finally {
      reader.close();
      stream.destroy();
    }

    if (!threadId) return null;

    const updatedAt = toDateValue(metaTimestamp) > 0 ? metaTimestamp : stats.mtime.toISOString();
    return {
      id: threadId,
      title: deriveThreadTitle(preview, cwd, threadId),
      preview: compactPreview(preview),
      cwd,
      updatedAt,
      filePath,
    };
  }

  private extractPreviewCandidate(envelope: z.infer<typeof lineEnvelopeSchema>): string {
    const eventLine = eventMessageLineSchema.safeParse(envelope);
    if (eventLine.success && eventLine.data.payload.type === 'user_message') {
      const normalized = normalizeUserText(eventLine.data.payload.message ?? '');
      if (normalized) return compactPreview(normalized);
    }

    const responseLine = responseMessageLineSchema.safeParse(envelope);
    if (responseLine.success && responseLine.data.payload.role === 'user') {
      const text = extractTextFromResponseContent(responseLine.data.payload.content);
      const normalized = normalizeUserText(text);
      if (normalized) return compactPreview(normalized);
    }

    return '';
  }

  private async readThreadMessages(filePath: string): Promise<ArchivedMessage[]> {
    const fromResponseItems: ArchivedMessage[] = [];
    const fallbackFromEvents: ArchivedMessage[] = [];
    let messageIndex = 0;

    const stream = createReadStream(filePath, { encoding: 'utf8' });
    const reader = createInterface({ input: stream, crlfDelay: Infinity });
    try {
      for await (const line of reader) {
        const envelope = toEnvelope(line);
        if (!envelope) continue;

        const responseLine = responseMessageLineSchema.safeParse(envelope);
        if (responseLine.success) {
          const role = responseLine.data.payload.role;
          if (role === 'user' || role === 'assistant') {
            const rawText = extractTextFromResponseContent(responseLine.data.payload.content);
            const text = role === 'user' ? normalizeUserText(rawText) : rawText.trim();
            if (text) {
              messageIndex += 1;
              fromResponseItems.push({
                id: `history-${messageIndex}`,
                role,
                text,
                createdAt: responseLine.data.timestamp ?? null,
              });
            }
          }
          continue;
        }

        const eventLine = eventMessageLineSchema.safeParse(envelope);
        if (!eventLine.success) continue;

        const eventType = eventLine.data.payload.type;
        if (eventType === 'user_message') {
          const text = normalizeUserText(eventLine.data.payload.message ?? '');
          if (!text) continue;
          messageIndex += 1;
          fallbackFromEvents.push({
            id: `event-${messageIndex}`,
            role: 'user',
            text,
            createdAt: eventLine.data.timestamp ?? null,
          });
          continue;
        }

        if (eventType === 'agent_message') {
          const text = (eventLine.data.payload.message ?? '').trim();
          if (!text) continue;
          messageIndex += 1;
          fallbackFromEvents.push({
            id: `event-${messageIndex}`,
            role: 'assistant',
            text,
            createdAt: eventLine.data.timestamp ?? null,
          });
          continue;
        }

        if (eventType === 'task_complete') {
          const text = (eventLine.data.payload.last_agent_message ?? '').trim();
          if (!text) continue;
          messageIndex += 1;
          fallbackFromEvents.push({
            id: `event-${messageIndex}`,
            role: 'assistant',
            text,
            createdAt: eventLine.data.timestamp ?? null,
          });
        }
      }
    } finally {
      reader.close();
      stream.destroy();
    }

    if (fromResponseItems.length > 0) return dedupeAdjacentMessages(fromResponseItems);
    return dedupeAdjacentMessages(fallbackFromEvents);
  }
}

const resolveCodexHome = (): string => {
  const fromEnv = process.env.CODEX_HOME?.trim() ?? '';
  if (fromEnv) return fromEnv;
  return join(homedir(), '.codex');
};
