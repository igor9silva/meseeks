import { z } from 'zod/v3';

const scheduleArgsSchema = z.object({
	instructions: z.string().optional(),
});

export function getScheduleInstructions(schedule: { args: unknown }) {
	//
	const parsed = scheduleArgsSchema.safeParse(schedule.args);
	if (!parsed.success) return undefined;

	return parsed.data.instructions;
}
