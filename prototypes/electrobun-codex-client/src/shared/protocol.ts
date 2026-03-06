import { z } from 'zod';

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  appServerVersion: z.string(),
});

export const threadStartParamsSchema = z.object({
  cwd: z.string(),
  title: z.string().min(1),
});

export const threadStartResponseSchema = z.object({
  threadId: z.string().min(1),
});

export const runStartParamsSchema = z.object({
  threadId: z.string().min(1),
  prompt: z.string().min(1),
});

export const runStartResponseSchema = z.object({
  runId: z.string().min(1),
});

export const approvalDecisionSchema = z.enum(['approve', 'deny']);

export const commandApprovalPayloadSchema = z.object({
  requestId: z.string().min(1),
  command: z.string().min(1),
  reason: z.string().min(1),
});

export const fileApprovalPayloadSchema = z.object({
  requestId: z.string().min(1),
  filePath: z.string().min(1),
  action: z.enum(['read', 'write', 'delete']),
  reason: z.string().min(1),
});

export const streamEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('output.delta'), runId: z.string(), text: z.string() }),
  z.object({ type: z.literal('run.completed'), runId: z.string() }),
  z.object({ type: z.literal('run.failed'), runId: z.string(), message: z.string() }),
  z.object({ type: z.literal('approval.command.required'), runId: z.string(), payload: commandApprovalPayloadSchema }),
  z.object({ type: z.literal('approval.file.required'), runId: z.string(), payload: fileApprovalPayloadSchema }),
]);

export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type ThreadStartParams = z.infer<typeof threadStartParamsSchema>;
export type ThreadStartResponse = z.infer<typeof threadStartResponseSchema>;
export type RunStartParams = z.infer<typeof runStartParamsSchema>;
export type RunStartResponse = z.infer<typeof runStartResponseSchema>;
export type StreamEvent = z.infer<typeof streamEventSchema>;
export type ApprovalDecision = z.infer<typeof approvalDecisionSchema>;
