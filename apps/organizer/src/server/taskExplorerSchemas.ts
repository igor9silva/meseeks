import { z } from 'zod';

export const taskSourceSchema = z.enum(['public', 'private']);
export const taskPrioritySchema = z.enum(['critical', 'high', 'medium', 'low']);
export const explorerSortSchema = z.enum(['priority_then_recency', 'recency', 'title']);

export const explorerQuerySchema = z.object({
	q: z.string().optional().default(''),
	sources: z.array(taskSourceSchema).optional().default(['public', 'private']),
	tags: z.array(z.string().min(1)).optional().default([]),
	excludedTags: z.array(z.string().min(1)).optional().default([]),
	parentKey: z.string().min(1).nullable().optional().default(null),
	minDepth: z.number().int().min(1).max(16).optional().default(1),
	maxDepth: z.number().int().min(1).max(16).optional().default(1),
	sort: explorerSortSchema.optional().default('priority_then_recency'),
});

export const detailQuerySchema = z.object({
	taskKey: z.string().min(1),
});

export const pathQuerySchema = z.object({
	taskSource: taskSourceSchema,
	taskPath: z.string(),
});

export const tagMutationSchema = z.object({
	taskKey: z.string().min(1),
	action: z.enum(['add', 'remove']),
	tag: z.string().trim().min(1).max(64),
});

export const priorityMutationSchema = z.object({
	taskKey: z.string().min(1),
	priority: taskPrioritySchema.nullable(),
});

export const titleMutationSchema = z.object({
	taskKey: z.string().min(1),
	title: z.string().trim().min(1).max(180),
});

export const statusMutationSchema = z.object({
	taskKey: z.string().min(1),
	status: z.enum(['backlog', 'active', 'completed']),
});

export const updateTaskSourceInputSchema = z.object({
	taskKey: z.string().min(1),
	taskSource: taskSourceSchema,
});

export const renameTaskInputSchema = z.object({
	taskKey: z.string().min(1),
	filename: z.string().trim().min(1).max(180),
});

export const createTaskInputSchema = z.object({
	body: z.string().trim().min(1).max(50000),
	filename: z.string().trim().max(180).optional().default(''),
	priority: taskPrioritySchema.optional().default('medium'),
	status: z.enum(['backlog', 'active', 'completed']).nullable().optional().default(null),
	tags: z.array(z.string().trim().min(1).max(64)).optional().default([]),
	taskSource: taskSourceSchema.optional().default('private'),
	parentPath: z.string().optional().default('inbox'),
	title: z.string().trim().max(180).optional().default(''),
});

export type ExplorerQuery = z.infer<typeof explorerQuerySchema>;
export type DetailQuery = z.infer<typeof detailQuerySchema>;
export type PathQuery = z.infer<typeof pathQuerySchema>;
export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;
