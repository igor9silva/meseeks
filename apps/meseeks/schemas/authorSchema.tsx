import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';

export const authorSchema = z
	.union([
		zid('users'), //
		zid('actions'),
		zid('triggers'),
	])
	.describe('The author is the immediate user, action, or trigger cause.');
