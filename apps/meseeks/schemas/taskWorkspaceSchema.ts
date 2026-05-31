import { z } from 'zod';

export const TASK_WORKSPACE_PREFERENCE_PREFIX = 'taskWorkspace:';

export const taskWorkspacePinSchema = z.object({
	actionId: z.string().min(1),
	label: z.string().min(1).max(180),
	text: z.string().max(5000),
	skillKey: z.string().min(1).max(80),
	createdAt: z.number(),
	pinnedAt: z.number(),
	done: z.boolean().optional(),
});

export const taskWorkspaceSchema = z.object({
	notes: z.string().default(''),
	pins: z.array(taskWorkspacePinSchema).default([]),
	updatedAt: z.number().optional(),
});

export type TaskWorkspace = z.infer<typeof taskWorkspaceSchema>;
export type TaskWorkspacePin = z.infer<typeof taskWorkspacePinSchema>;

export const EMPTY_TASK_WORKSPACE: TaskWorkspace = {
	notes: '',
	pins: [],
};

export function taskWorkspacePreferenceKey(taskId: string) {
	return `${TASK_WORKSPACE_PREFERENCE_PREFIX}${taskId}`;
}

export function normalizeTaskWorkspace(value: unknown): TaskWorkspace {
	const parsed = taskWorkspaceSchema.safeParse(value);
	if (!parsed.success) return EMPTY_TASK_WORKSPACE;

	const seen = new Set<string>();
	const pins = parsed.data.pins
		.filter((pin) => {
			if (seen.has(pin.actionId)) return false;
			seen.add(pin.actionId);
			return true;
		})
		.slice(0, 50);

	return {
		notes: parsed.data.notes,
		pins,
		updatedAt: parsed.data.updatedAt,
	};
}

export function renderTaskWorkspaceForPrompt(workspace: TaskWorkspace) {
	const notes = workspace.notes.trim();
	const activePins = workspace.pins.filter((pin) => !pin.done);

	if (!notes && activePins.length === 0) {
		return '<system>No task working memory.</system>';
	}

	return [
		notes ? `<notes>${escapeXml(notes)}</notes>` : '',
		activePins.length > 0
			? [
					'<pinnedActions>',
					activePins
						.map(
							(pin) =>
								`<pin actionId="${escapeXml(pin.actionId)}" skill="${escapeXml(
									pin.skillKey,
								)}" pinnedAt="${new Date(pin.pinnedAt).toISOString()}"><label>${escapeXml(
									pin.label,
								)}</label><text>${escapeXml(pin.text)}</text></pin>`,
						)
						.join(''),
					'</pinnedActions>',
				].join('')
			: '',
	].join('');
}

function escapeXml(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');
}
