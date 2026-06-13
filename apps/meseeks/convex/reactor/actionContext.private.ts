'use node';

import type { ActionCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import type { SourceAuthor } from './causality.private';

export type StartedAction = {
	ctx: ActionCtx;
	owner: Id<'users'>;
	directory: Id<'files'>;
	actionId: Id<'actions'>;
	skillKey: string;
	loopKey?: string;
	intelligenceKey?: string;
	args: Record<string, unknown>;
	depth: number;
	author: SourceAuthor;
};
