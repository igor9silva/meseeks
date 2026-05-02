import { z } from "zod";

export const taskSourceSchema = z.enum(["public", "private"]);
export const taskPrioritySchema = z.enum(["critical", "high", "medium", "low"]);
export const explorerSortSchema = z.enum([
	"priority_then_recency",
	"recency",
	"title",
]);

export const explorerQuerySchema = z.object({
	q: z.string().optional().default(""),
	sources: z.array(taskSourceSchema).optional().default(["public", "private"]),
	statuses: z
		.array(z.string().min(1))
		.optional()
		.default(["active", "backlog", "inbox"]),
	tags: z.array(z.string().min(1)).optional().default([]),
	excludedTags: z.array(z.string().min(1)).optional().default([]),
	rootsOnly: z.boolean().optional().default(false),
	sort: explorerSortSchema.optional().default("priority_then_recency"),
});

export const detailQuerySchema = z.object({
	taskKey: z.string().min(1),
});

export const tagMutationSchema = z.object({
	taskKey: z.string().min(1),
	action: z.enum(["add", "remove"]),
	tag: z.string().trim().min(1).max(64),
});

export const titleMutationSchema = z.object({
	taskKey: z.string().min(1),
	title: z.string().trim().min(1).max(180),
});

export const moveTaskInputSchema = z.object({
	taskKey: z.string().min(1),
	status: z.string().trim().min(1).max(64),
});

export const renameTaskInputSchema = z.object({
	taskKey: z.string().min(1),
	filename: z.string().trim().min(1).max(180),
});

export const createTaskInputSchema = z.object({
	body: z.string().max(50000).optional().default(""),
	filename: z.string().trim().max(180).optional().default(""),
	priority: taskPrioritySchema.optional().default("medium"),
	status: z.string().trim().min(1).max(64).optional().default("backlog"),
	tags: z.array(z.string().trim().min(1).max(64)).optional().default([]),
	taskSource: taskSourceSchema.optional().default("public"),
	title: z.string().trim().min(1).max(180),
});

export type ExplorerQuery = z.infer<typeof explorerQuerySchema>;
export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;
