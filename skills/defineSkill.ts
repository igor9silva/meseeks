import { z } from 'zod';
import { Doc } from 'convex/_generated/dataModel';
import { ActionCtx, MutationCtx } from 'convex/_generated/server';

export type Skill<T extends z.AnyZodObject> = {
	preApprovedCost: bigint | 'none';
	description: string;
	parameters: T;
	knownReactions: Array<Reaction>;
	use: (execution: ToolExecution<T>) => (args: z.infer<T>) => Promise<ExecutionResult>;
	hidden?: boolean;
	priority?: number;
};

export type ToolExecution<T extends z.AnyZodObject = z.AnyZodObject> = {
	ctx: ActionCtx | MutationCtx;
	task: Doc<'tasks'>;
	action: Doc<'actions'>;
	skill: Skill<T>;
};

export const reactionSchema = z.object({
	skillKey: z.string(),
	args: z.record(z.any()),
	condition: z.enum(['owner', 'companion', 'any']).optional(),
});
export type Reaction = z.infer<typeof reactionSchema>;

export const executionResultSchema = z.object({
	text: z.string().optional(),
	reactions: z.array(reactionSchema),
});
export type ExecutionResult = z.infer<typeof executionResultSchema>;

// for the types
export const defineSkill = <T extends z.AnyZodObject>(skill: Skill<T>) => ({
	...skill,
	hidden: skill.hidden ?? false,
	priority: skill.priority ?? 999999999,
});
