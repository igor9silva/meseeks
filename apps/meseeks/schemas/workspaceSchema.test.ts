import { describe, expect, test } from 'bun:test';
import { actionAuthorSchema, actionStatusSchema, changesetReviewStateSchema } from './workspaceSchema';

describe('PRO schema invariants', () => {
	test('does not allow a fake system action author', () => {
		expect(actionAuthorSchema.safeParse({ kind: 'system' }).success).toBe(false);
	});

	test('does not use discarded as an action or changeset state', () => {
		expect(actionStatusSchema.safeParse('discarded').success).toBe(false);
		expect(changesetReviewStateSchema.safeParse('discarded').success).toBe(false);
	});
});
