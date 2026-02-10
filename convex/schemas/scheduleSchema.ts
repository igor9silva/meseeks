import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod';
import { authorSchema } from './authorSchema';

export const timeZoneSchema = z
	.string()
	.describe(
		'Timezone using the IANA Time Zone Database format. e.g. `America/New_York`, `Europe/Paris`, `Asia/Tokyo`.',
	);

const coreScheduleSchema = z.object({
	taskId: zid('tasks'),
	owner: zid('users'),
	author: authorSchema,
	skillKey: z.string().describe('The skill to execute when scheduled'),
	args: z.record(z.any()).describe('Arguments to pass to the skill'),
	timeZone: timeZoneSchema,
	lastRunAt: z.number().optional().describe('Timestamp of last execution'),
	nextRunAt: z.number().describe('Timestamp of next scheduled execution'),
	scheduledJobId: z.string().optional().describe('Convex scheduler job ID for cancellation'),
});

export const oneTimeScheduleSchema = coreScheduleSchema.extend({
	scheduleType: z.literal('one-time'),
	scheduledAt: z.number().describe('Timestamp when to execute once'),
});

export const recurringScheduleSchema = coreScheduleSchema.extend({
	scheduleType: z.literal('recurring'),
	cronExpression: z.string().describe('Cron expression for recurring execution'),
});

export const scheduleSchema = z.union([
	oneTimeScheduleSchema, //
	recurringScheduleSchema,
]);

// Separate schemas for new schedule creation (without computed fields)
const newCoreScheduleSchema = z.object({
	taskId: zid('tasks'),
	owner: zid('users'),
	author: authorSchema,
	skillKey: z.string().describe('The skill to execute when scheduled'),
	args: z.record(z.any()).describe('Arguments to pass to the skill'),
	timeZone: timeZoneSchema,
});

export const newOneTimeScheduleSchema = newCoreScheduleSchema.extend({
	scheduleType: z.literal('one-time'),
	scheduledAt: z.number().describe('Timestamp when to execute once'),
});

export const newRecurringScheduleSchema = newCoreScheduleSchema.extend({
	scheduleType: z.literal('recurring'),
	cronExpression: z.string().describe('Cron expression for recurring execution'),
});

export const newScheduleSchema = z.union([
	newOneTimeScheduleSchema, //
	newRecurringScheduleSchema,
]);
