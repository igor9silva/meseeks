import { describe, expect, it } from 'bun:test';
import { normalizeTaskWorkspace, renderTaskWorkspaceForPrompt } from './taskWorkspaceSchema';

describe('taskWorkspaceSchema', () => {
	it('normalizes invalid workspace data to an empty workspace', () => {
		expect(normalizeTaskWorkspace({ pins: [{ actionId: '' }] })).toEqual({
			notes: '',
			pins: [],
		});
	});

	it('deduplicates pins while preserving the first instance', () => {
		const workspace = normalizeTaskWorkspace({
			notes: 'remember this',
			pins: [
				{
					actionId: 'action-1',
					label: 'First label',
					text: 'First text',
					skillKey: 'say',
					createdAt: 1,
					pinnedAt: 2,
				},
				{
					actionId: 'action-1',
					label: 'Second label',
					text: 'Second text',
					skillKey: 'say',
					createdAt: 3,
					pinnedAt: 4,
				},
			],
		});

		expect(workspace.pins).toHaveLength(1);
		expect(workspace.pins[0]?.label).toBe('First label');
	});

	it('renders only active pins into the prompt workspace', () => {
		const rendered = renderTaskWorkspaceForPrompt({
			notes: 'User note',
			pins: [
				{
					actionId: 'active-action',
					label: 'Active',
					text: 'Use this',
					skillKey: 'say',
					createdAt: 1,
					pinnedAt: 2,
				},
				{
					actionId: 'done-action',
					label: 'Done',
					text: 'Ignore this',
					skillKey: 'say',
					createdAt: 1,
					pinnedAt: 2,
					done: true,
				},
			],
		});

		expect(rendered).toContain('<notes>User note</notes>');
		expect(rendered).toContain('active-action');
		expect(rendered).not.toContain('done-action');
	});
});
