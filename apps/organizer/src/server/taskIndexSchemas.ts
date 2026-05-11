import { z } from 'zod';

const taskSourceSchema = z.enum(['public', 'private']);

const taskTagSchema = z.object({
	tag: z.string().min(1),
	key: z.string().min(1).nullable(),
	value: z.string().min(1),
});

const taskTagGroupValueSchema = z.object({
	tag: z.string().min(1),
	value: z.string().min(1),
	count: z.number(),
});

const taskTagGroupSchema = z.object({
	key: z.string().min(1).nullable(),
	values: z.array(taskTagGroupValueSchema),
});

const warningEntrySchema = z.object({
	taskKey: z.string().min(1),
	relativePath: z.string().min(1),
	message: z.string().min(1),
});

const taskSummarySchema = z
	.object({
		key: z.string().min(1),
		taskSource: taskSourceSchema,
		id: z.string().min(1),
		title: z.string().min(1),
		status: z.string().min(1),
		bucket: z.string().min(1),
		priority: z.string().min(1).nullable(),
		tags: z.array(z.string()),
		tagDetails: z.array(taskTagSchema).optional().default([]),
		parentId: z.string().nullable(),
		parentKey: z.string().nullable(),
		parentSource: z.string().min(1),
		created: z.string().min(1),
		updated: z.string().min(1),
		source: taskSourceSchema,
		bodyExcerpt: z.string(),
		bodySearch: z.string(),
		relativePath: z.string().min(1),
		fileMtimeMs: z.number(),
		warnings: z.array(z.string()),
	})
	.passthrough();

const metaSummarySchema = z
	.object({
		totalTasks: z.number(),
		totalWarnings: z.number(),
		bySource: z.record(z.string(), z.number()),
		byStatus: z.record(z.string(), z.number()),
	})
	.passthrough();

export const tasksMetaSchema = z
	.object({
		version: z.number(),
		generatedAt: z.string().min(1),
		summary: metaSummarySchema,
		warnings: z.array(warningEntrySchema),
		tasks: z.array(taskSummarySchema),
	})
	.passthrough();

export const tasksLookupSchema = z
	.object({
		version: z.number(),
		generatedAt: z.string().min(1),
		keyToPath: z.record(z.string(), z.string()),
		idToKeys: z.record(z.string(), z.array(z.string())),
		statusToKeys: z.record(z.string(), z.array(z.string())),
		tagToKeys: z.record(z.string(), z.array(z.string())),
		tagGroups: z.array(taskTagGroupSchema).optional().default([]),
	})
	.passthrough();

const graphNodeSchema = z
	.object({
		key: z.string().min(1),
		taskSource: taskSourceSchema,
		id: z.string().min(1),
		title: z.string().min(1),
		status: z.string().min(1),
		bucket: z.string().min(1),
		parentId: z.string().nullable(),
		parentKey: z.string().nullable(),
		relativePath: z.string().min(1),
	})
	.passthrough();

const graphEdgeSchema = z
	.object({
		type: z.enum(['parent']),
		from: z.string().min(1),
		to: z.string().nullable(),
		targetId: z.string().min(1),
		resolved: z.boolean(),
	})
	.passthrough();

export const tasksGraphSchema = z
	.object({
		version: z.number(),
		generatedAt: z.string().min(1),
		nodes: z.array(graphNodeSchema),
		edges: z.array(graphEdgeSchema),
	})
	.passthrough();

const contentEntrySchema = z
	.object({
		key: z.string().min(1),
		taskSource: taskSourceSchema,
		relativePath: z.string().min(1),
		body: z.string(),
		rawFrontmatter: z.string().nullable(),
	})
	.passthrough();

export const tasksContentSchema = z
	.object({
		version: z.number(),
		generatedAt: z.string().min(1),
		entries: z.array(contentEntrySchema),
	})
	.passthrough();

export type TaskSource = z.infer<typeof taskSourceSchema>;
export type TaskSummary = z.infer<typeof taskSummarySchema>;
export type WarningEntry = z.infer<typeof warningEntrySchema>;
export type TasksMeta = z.infer<typeof tasksMetaSchema>;
export type TasksLookup = z.infer<typeof tasksLookupSchema>;
export type TasksGraph = z.infer<typeof tasksGraphSchema>;
export type TasksContent = z.infer<typeof tasksContentSchema>;
