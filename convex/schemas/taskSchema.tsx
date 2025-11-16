import { zid } from 'convex-helpers/server/zod';
import { z } from 'zod';
import { authorSchema } from './authorSchema';
import { intelligenceKeys } from './intelligenceSchema';

export const taskStatusSchema = z.enum([
	'idle', //
	'acting', // companion is working
	'unread', // companion is not working, you have unread actions
	'blocked', // companion is block, requires your attention
	'discarded', // task was discarded, not relevant for future reference
	'done', // task was resolved
]);

export const taskBudgetSchema = z.object({
	total: z
		.bigint() //
		.describe('The total amount of energy the user has budgeted for this task.'),
	available: z
		.bigint() //
		.describe('The remaining/available amount of energy available to spend on this task (total - spent).'),
});

export const taskSchema = z
	.object({
		author: authorSchema.describe('Who created the task.'),
		owner: zid('users').describe('The user who is responsible for the task.'),
		title: z.string().max(60).optional().describe('A short title for the task. Max 60 characters.'),
		instructions: z
			.string()
			.optional()
			.describe('An MDX detailed description of what should be done to achieve the task.'),
		summary: z.string().optional().describe('A summary of the task activity.'),
		status: taskStatusSchema,
		isActive: z.boolean().describe('Computed from status.'),
		parentId: zid('tasks').optional().describe('The parent task ID of this task.'),
		lastUpdatedAt: z.number().optional().describe('The last time the task instructions were reviewed/updated.'),
		// lastReadAction: zid('actions').optional().describe('The last action that was "read" by the user.'),
		energyBudget: taskBudgetSchema,
		embeddingId: zid('taskEmbeddings').optional(),
		preferredIntelligence: intelligenceKeys.optional().describe('The preferred intelligence to use for this task.'),
		availableSkills: z
			.array(z.string())
			.max(16)
			.optional()
			.describe('List of skill keys that are available for this task. Max 16 skills.'),
	})
	.describe(`It's a goal to be achieved. A Task is the basic and most fundamental entity of Meseeks.`);

export const taskEmbeddingsSchema = z.object({
	taskId: zid('tasks'),
	embedding: z.array(z.number()),
	status: taskStatusSchema,
});
