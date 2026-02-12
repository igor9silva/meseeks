import { zid } from 'convex-helpers/server/zod';
import { z } from 'zod';

export const authorSchema = z
	.union([
		zid('users'), //
		zid('actions'),
	])
	.describe('The author of an action is the user, when directly executed, or the action that led to it.');
