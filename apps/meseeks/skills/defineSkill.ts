import { convexValueSchema } from 'schemas/convexValueSchema';
import { z } from 'zod';
import { Doc } from 'convex/_generated/dataModel';
import { ActionCtx, MutationCtx } from 'convex/_generated/server';

export type Skill<T extends z.ZodObject> = {
	preApprovedCost: bigint | 'none';
	description: string;
	parameters: T;
	knownReactions: Array<Reaction>;
	use: (execution: ToolExecution<NoInfer<T>>) => (args: z.infer<NoInfer<T>>) => Promise<ExecutionResult>;
	hidden?: boolean;
	priority?: number;
};

export type ToolExecution<T extends z.ZodObject = z.ZodObject> = {
	ctx: ActionCtx | MutationCtx;
	task: Doc<'tasks'>;
	action: Doc<'actions'>;
	skill: Skill<T>;
};

export const reactionSchema = z.object({
	skillKey: z.string(),
	args: z.record(z.string(), convexValueSchema),
	condition: z.enum(['owner', 'companion', 'any']).optional(),
});
export type Reaction = z.infer<typeof reactionSchema>;

export const executionResultSchema = z.object({
	text: z.string().optional(),
	reactions: z.array(reactionSchema),
});
export type ExecutionResult = z.infer<typeof executionResultSchema>;

// for the types
export const defineSkill = <T extends z.ZodObject>(skill: Skill<T>) => ({
	...skill,
	// keep schema and handler together when skills with different parameters share a tool registry.
	execute: (execution: Omit<ToolExecution<T>, 'skill'>, args: unknown) =>
		skill.use({ ...execution, skill })(skill.parameters.parse(args)),
	hidden: skill.hidden ?? false,
	priority: skill.priority ?? 999999999,
});
