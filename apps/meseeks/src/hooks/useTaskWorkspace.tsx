import type { Doc, Id } from 'convex/_generated/dataModel';
import { api } from 'convex/_generated/api';
import { createContext, useCallback, useContext, useMemo } from 'react';
import { useMutation, useQuery } from 'convex/react';
import {
	EMPTY_TASK_WORKSPACE,
	type TaskWorkspace,
	type TaskWorkspacePin,
	normalizeTaskWorkspace,
	taskWorkspacePreferenceKey,
} from 'schemas/taskWorkspaceSchema';

type TaskWorkspaceContextValue = {
	workspace: TaskWorkspace;
	pins: TaskWorkspacePin[];
	notes: string;
	isLoaded: boolean;
	isPinned: (actionId: Id<'actions'>) => boolean;
	addPin: (action: Doc<'actions'>) => void;
	removePin: (actionId: Id<'actions'> | string) => void;
	togglePin: (action: Doc<'actions'>) => void;
	setPinDone: (actionId: Id<'actions'> | string, done: boolean) => void;
	setNotes: (notes: string) => void;
};

const TaskWorkspaceContext = createContext<TaskWorkspaceContextValue | null>(null);

export function TaskWorkspaceProvider({ taskId, children }: { taskId: Id<'tasks'>; children: React.ReactNode }) {
	const key = taskWorkspacePreferenceKey(taskId);
	const preference = useQuery(api.users.preferences.get, { key });
	const setPreference = useMutation(api.users.preferences.set).withOptimisticUpdate((localStore, args) => {
		const existingPreference = localStore.getQuery(api.users.preferences.get, { key: args.key });

		if (existingPreference) {
			localStore.setQuery(
				api.users.preferences.get, //
				{ key: args.key },
				{ ...existingPreference, value: args.value },
			);
		}
	});

	const workspace = useMemo(
		() => (preference === undefined ? EMPTY_TASK_WORKSPACE : normalizeTaskWorkspace(preference?.value)),
		[preference],
	);

	const saveWorkspace = useCallback(
		(nextWorkspace: TaskWorkspace) => {
			setPreference({
				key,
				value: {
					...nextWorkspace,
					updatedAt: Date.now(),
				},
			});
		},
		[key, setPreference],
	);

	const addPin = useCallback(
		(action: Doc<'actions'>) => {
			const pin = createPinFromAction(action);
			if (!pin) return;

			saveWorkspace({
				...workspace,
				pins: [pin, ...workspace.pins.filter((item) => item.actionId !== action._id)].slice(0, 50),
			});
		},
		[saveWorkspace, workspace],
	);

	const removePin = useCallback(
		(actionId: Id<'actions'> | string) => {
			saveWorkspace({
				...workspace,
				pins: workspace.pins.filter((pin) => pin.actionId !== actionId),
			});
		},
		[saveWorkspace, workspace],
	);

	const togglePin = useCallback(
		(action: Doc<'actions'>) => {
			if (workspace.pins.some((pin) => pin.actionId === action._id)) {
				removePin(action._id);
			} else {
				addPin(action);
			}
		},
		[addPin, removePin, workspace.pins],
	);

	const setPinDone = useCallback(
		(actionId: Id<'actions'> | string, done: boolean) => {
			saveWorkspace({
				...workspace,
				pins: workspace.pins.map((pin) => (pin.actionId === actionId ? { ...pin, done } : pin)),
			});
		},
		[saveWorkspace, workspace],
	);

	const setNotes = useCallback(
		(notes: string) => {
			saveWorkspace({
				...workspace,
				notes,
			});
		},
		[saveWorkspace, workspace],
	);

	const value = useMemo<TaskWorkspaceContextValue>(
		() => ({
			workspace,
			pins: workspace.pins,
			notes: workspace.notes,
			isLoaded: preference !== undefined,
			isPinned: (actionId) => workspace.pins.some((pin) => pin.actionId === actionId),
			addPin,
			removePin,
			togglePin,
			setPinDone,
			setNotes,
		}),
		[addPin, preference, removePin, setNotes, setPinDone, togglePin, workspace],
	);

	return <TaskWorkspaceContext.Provider value={value}>{children}</TaskWorkspaceContext.Provider>;
}

export function useTaskWorkspace() {
	const context = useContext(TaskWorkspaceContext);
	if (!context) throw new Error('useTaskWorkspace must be used inside TaskWorkspaceProvider');
	return context;
}

export function useOptionalTaskWorkspace() {
	return useContext(TaskWorkspaceContext);
}

export function getActionPinText(action: Doc<'actions'>) {
	const message = action.args.message;
	if (typeof message === 'string' && message.trim()) return message.trim();

	const content = action.args.content;
	if (typeof content === 'string' && content.trim()) return content.trim();

	const instructions = action.args.instructions;
	if (typeof instructions === 'string' && instructions.trim()) return instructions.trim();

	if (action.result && action.result.text?.trim()) return action.result.text.trim();

	return null;
}

function createPinFromAction(action: Doc<'actions'>): TaskWorkspacePin | null {
	const text = getActionPinText(action);
	if (!text) return null;

	const clippedText = clipText(text, 5000);
	return {
		actionId: action._id,
		label: createPinLabel(clippedText, action.skillKey),
		text: clippedText,
		skillKey: action.skillKey,
		createdAt: action._creationTime,
		pinnedAt: Date.now(),
	};
}

function createPinLabel(text: string, skillKey: string) {
	const meaningfulLine = text
		.split('\n')
		.map((line) => line.replace(/^#+\s*/, '').trim())
		.find(Boolean);

	return clipText(meaningfulLine || skillKey, 120);
}

function clipText(value: string, maxLength: number) {
	if (value.length <= maxLength) return value;
	return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}
