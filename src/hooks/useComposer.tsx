import type { Doc, Id } from 'convex/_generated/dataModel';
import { asBigInt } from 'convex/lib/money';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { EnqueuedSkill, SkillToEnqueue } from '~/components/ActionComposer/types';
import type { ComposerURLState } from '~/lib/composerUrl';
import { useAct } from './useAct';
import { useComposerUrl } from './useComposerUrl';

// context value type
type ComposerContextValue = {
	// state
	queue: EnqueuedSkill[];
	message: string;
	isEmpty: boolean;

	// mutations (enqueue returns false if queue is full)
	enqueue: (skill: SkillToEnqueue, options?: { clearMessage?: boolean }) => boolean;
	dequeue: (id: string) => void;
	setMessage: (message: string) => void;
	clear: () => void;
	clearQueue: () => void;

	// actions
	submit: (taskId: Id<'tasks'>, task: Doc<'tasks'>) => Promise<void>;
	isSubmitting: boolean;
};

const ComposerContext = createContext<ComposerContextValue | null>(null);

export function useComposer() {
	//
	const context = useContext(ComposerContext);

	if (!context) {
		throw new Error('useComposer must be used within ComposerProvider');
	}

	return context;
}

const MAX_QUEUE_SIZE = 16;
const MESSAGE_SYNC_DELAY = 500; // ms - debounce URL updates for message
const BUDGET_SKILL_KEYS = ['increaseBudget', 'decreaseBudget'];

export function ComposerProvider({ children }: { children: React.ReactNode }) {
	//
	const { state, updateState, clearState } = useComposerUrl();
	const { act, isActing } = useAct();

	// keep message in local state for performance, sync to URL with debounce
	const [localMessage, setLocalMessage] = useState(state.m);
	const messageSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// stable ID counter for queue items
	const idCounterRef = useRef(0);
	const queueIdsRef = useRef<Map<number, string>>(new Map());

	// convert URL state to EnqueuedSkill format with stable IDs
	const queue = useMemo(() => {
		//
		// ensure we have stable IDs for each index
		const newIds = new Map<number, string>();

		return state.q.map((item, index): EnqueuedSkill => {
			// reuse existing ID for this index if available, otherwise create new
			let id = queueIdsRef.current.get(index);
			if (!id) {
				id = `${item.k}-${idCounterRef.current++}`;
			}
			newIds.set(index, id);

			return {
				id,
				skillKey: item.k,
				args: item.a,
				enqueuedAt: Date.now(),
			};
		});

		// update ref after mapping (can't do inside useMemo cleanly, but this is fine for perf)
	}, [state.q]);

	// update ID ref when queue changes
	useMemo(() => {
		const newIds = new Map<number, string>();
		queue.forEach((item, index) => {
			newIds.set(index, item.id);
		});
		queueIdsRef.current = newIds;
	}, [queue]);

	const message = localMessage;
	const isEmpty = state.q.length === 0 && !localMessage.trim();

	const enqueue = useCallback(
		(skill: SkillToEnqueue, options?: { clearMessage?: boolean }): boolean => {
			//
			if (state.q.length >= MAX_QUEUE_SIZE) {
				toast.error(`Queue is full (max ${MAX_QUEUE_SIZE} actions)`);
				return false;
			}

			const newQueueItem = { k: skill.skillKey, a: skill.args };
			const updates: Partial<ComposerURLState> = {
				q: state.q.concat(newQueueItem),
			};

			if (options?.clearMessage) {
				updates.m = '';
				setLocalMessage('');
				// cancel pending sync
				if (messageSyncTimeoutRef.current) {
					clearTimeout(messageSyncTimeoutRef.current);
					messageSyncTimeoutRef.current = null;
				}
			}

			updateState(updates);
			return true;
		},
		[state.q, updateState],
	);

	const dequeue = useCallback(
		(id: string) => {
			//
			const index = queue.findIndex((item) => item.id === id);
			if (index === -1) return;

			const newQueue = state.q.filter((_, i) => i !== index);
			updateState({ q: newQueue });
		},
		[queue, state.q, updateState],
	);

	const setMessage = useCallback(
		(newMessage: string) => {
			//
			// update local state immediately for responsive UI
			setLocalMessage(newMessage);

			// debounce URL sync
			if (messageSyncTimeoutRef.current) {
				clearTimeout(messageSyncTimeoutRef.current);
			}

			messageSyncTimeoutRef.current = setTimeout(() => {
				updateState({ m: newMessage });
				messageSyncTimeoutRef.current = null;
			}, MESSAGE_SYNC_DELAY);
		},
		[updateState],
	);

	const clear = useCallback(() => {
		//
		setLocalMessage('');
		if (messageSyncTimeoutRef.current) {
			clearTimeout(messageSyncTimeoutRef.current);
			messageSyncTimeoutRef.current = null;
		}
		clearState();
	}, [clearState]);

	const clearQueue = useCallback(() => {
		//
		updateState({ q: [] });
	}, [updateState]);

	const submit = useCallback(
		async (taskId: Id<'tasks'>, task: Doc<'tasks'>) => {
			//
			const skills = buildFinalSkills(queue, localMessage, task);

			if (skills.length === 0) return;

			await act(
				{
					taskId,
					skills,
					shouldReopen: true,
				},
				{
					onSuccess: () => {
						clear();
					},
				},
			);
		},
		[queue, localMessage, act, clear],
	);

	const value: ComposerContextValue = {
		queue,
		message,
		isEmpty,
		enqueue,
		dequeue,
		setMessage,
		clear,
		clearQueue,
		submit,
		isSubmitting: isActing,
	};

	return <ComposerContext.Provider value={value}>{children}</ComposerContext.Provider>;
}

// builds final skills array with proper ordering and type conversion
function buildFinalSkills(queue: EnqueuedSkill[], message: string, task: Doc<'tasks'>): SkillToEnqueue[] {
	//
	const result: SkillToEnqueue[] = [];

	// 1. budget skills first (from queue) - convert dollars to bigint
	const budgetSkills = queue.filter((s) => BUDGET_SKILL_KEYS.includes(s.skillKey));
	result.push(...budgetSkills.map(toBudgetSkill));

	// 2. other queued skills
	const otherSkills = queue.filter((s) => !BUDGET_SKILL_KEYS.includes(s.skillKey));
	result.push(...otherSkills.map(toSkillToEnqueue));

	// 3. message as 'say' skill
	const trimmedMessage = message.trim();
	if (trimmedMessage) {
		result.push({ skillKey: 'say', args: { message: trimmedMessage } });
	}

	// 4. default to requestIteration if nothing else
	if (result.length === 0 && task.status !== 'acting') {
		result.push({ skillKey: 'requestIteration', args: {} });
	}

	return result;
}

function toSkillToEnqueue(skill: EnqueuedSkill): SkillToEnqueue {
	//
	return {
		skillKey: skill.skillKey,
		args: skill.args,
		source: skill.source,
	};
}

function toBudgetSkill(skill: EnqueuedSkill): SkillToEnqueue {
	//
	// budget skills store dollars as number, convert to bigint for backend
	const dollars = skill.args['dollars'] as number | undefined;
	const amount = dollars ? asBigInt({ dollars }) : 0n;

	return {
		skillKey: skill.skillKey,
		args: { amount },
		source: skill.source,
	};
}
