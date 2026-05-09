import { Doc, Id } from 'convex/_generated/dataModel';

export function createReactions(
	action: Doc<'actions'>,
	reactions?: Array<{
		skillKey: string;
		args: Record<string, any>;
		condition?: 'owner' | 'companion' | 'any';
	}>,
) {
	return (reactions ?? [])
		.filter((reaction) => {
			// oxfmt-ignore
			switch (reaction.condition ?? 'any') {
				case 'owner': return action.owner === action.author;
				case 'companion': return action.owner !== action.author;
				case 'any': return true;
				default: return false;
			}
		})
		.map((reaction) => ({
			skillKey: reaction.skillKey,
			args: reaction.args,
			taskId: action.taskId,
			owner: action.owner,
			depth: action.depth + 1,
			author: action._id as Id<'actions'> | Id<'users'>, // I have no idea why I need that cast, as it expects a union of Id<'actions'> or Id<'users'>
		}));
}
