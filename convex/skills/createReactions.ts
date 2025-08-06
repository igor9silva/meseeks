import { z } from 'zod';
import { Doc, Id } from '../_generated/dataModel';
import { newActionSchema } from '../schemas/actionSchema';

export function createReactions(
	action: Doc<'actions'>,
	reactions?: Array<{
		skillKey: string;
		args: Record<string, any>;
		condition?: 'owner' | 'companion' | 'any';
	}>,
): Array<z.infer<typeof newActionSchema>> {
	//
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
			author: action._id as Id<'actions'> | Id<'users'>, // I have no idea why I need that cast, as it expects a union of Id<'actions'> or Id<'users'>
			status: 'enqueued' as const,
		}));
}
