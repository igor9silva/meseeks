import { Doc } from 'convex/_generated/dataModel';
import type { z } from 'zod/v3';
import type { newActionSchema } from 'schemas/actionSchema';

export function createReactions(
	action: Doc<'actions'>,
	reactions?: Array<{
		skillKey: string;
		args: Record<string, unknown>;
		condition?: 'owner' | 'companion' | 'any';
	}>,
): Array<z.infer<typeof newActionSchema>> {
	return (reactions ?? [])
		.filter((reaction) => {
			// prettier-ignore
			switch (reaction.condition ?? 'any') {
				case 'owner': return action.owner === action.author;
				case 'companion': return action.owner !== action.author;
				case 'any': return true;
			}
		})
		.map((reaction) => ({
			skillKey: reaction.skillKey,
			args: reaction.args,
			taskId: action.taskId,
			owner: action.owner,
			depth: action.depth + 1,
			author: action._id,
		}));
}
