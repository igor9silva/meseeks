import { z } from 'zod';
import { getDefaultTaskBuckets } from '~/lib/taskBuckets';

export const taskSourceSchema = z.enum(['public', 'private']);
export const taskPrioritySchema = z.enum(['critical', 'high', 'medium', 'low']);
export const explorerSortSchema = z.enum(['priority_then_recency', 'recency', 'title']);

export const explorerQuerySchema = z.object({
	q: z.string().optional().default(''),
	sources: z.array(taskSourceSchema).optional().default(['public', 'private']),
	statuses: z
		.array(z.string().min(1))
		.optional()
		.default(() => getDefaultTaskBuckets()),
	tags: z.array(z.string().min(1)).optional().default([]),
	excludedTags: z.array(z.string().min(1)).optional().default([]),
	rootsOnly: z.boolean().optional().default(false),
	sort: explorerSortSchema.optional().default('priority_then_recency'),
});

export const detailQuerySchema = z.object({
	taskKey: z.string().min(1),
});

export const tagMutationSchema = z.object({
	taskKey: z.string().min(1),
	action: z.enum(['add', 'remove']),
	tag: z.string().trim().min(1).max(64),
});

export const priorityMutationSchema = z.object({
	taskKey: z.string().min(1),
	priority: taskPrioritySchema,
});

export const titleMutationSchema = z.object({
	taskKey: z.string().min(1),
	title: z.string().trim().min(1).max(180),
});

export const moveTaskInputSchema = z.object({
	taskKey: z.string().min(1),
	status: z.string().trim().min(1).max(64),
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
	status: z.string().trim().min(1).max(64).optional().default('inbox'),
	tags: z.array(z.string().trim().min(1).max(64)).optional().default([]),
	taskSource: taskSourceSchema.optional().default('private'),
	title: z.string().trim().max(180).optional().default(''),
});

export type ExplorerQuery = z.infer<typeof explorerQuerySchema>;
export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;
