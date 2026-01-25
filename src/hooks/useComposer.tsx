import type { Doc, Id } from 'convex/_generated/dataModel';
import { asBigInt } from 'convex/lib/money';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { EnqueuedSkill, SkillToEnqueue } from '~/components/ActionComposer/types';
import { useAct } from './useAct';
import { useDraftSync } from './useDraftSync';

const MAX_QUEUE_SIZE = 16;
const BUDGET_SKILL_KEYS = ['increaseBudget', 'decreaseBudget'];

type QueueItem = { skillKey: string; args: Record<string, unknown> };

export type ServerDraft = {
	queue: QueueItem[];
	message: string;
};

type ComposerContextValue = {
	// state
	queue: EnqueuedSkill[];
	message: string;
	isEmpty: boolean;

	// server draft conflict
	pendingServerDraft: ServerDraft | null;
	restoreServerDraft: () => void;
	dismissServerDraft: () => void;

	// mutations (enqueue returns false if queue is full)
	enqueue: (skill: SkillToEnqueue, options?: { clearMessage?: boolean }) => boolean;
	dequeue: (id: string) => void;
	setMessage: (message: string) => void;
	clear: () => void;
	clearQueue: () => void;

	// actions
	submit: (task: Doc<'tasks'>) => Promise<void>;
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

type ComposerProviderProps = {
	taskId: Id<'tasks'>;
	children: React.ReactNode;
};

export function ComposerProvider({ taskId, children }: ComposerProviderProps) {
	//
	const { act, isActing } = useAct();

	// local state
	const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
	const [message, setMessageState] = useState('');
	const [pendingServerDraft, setPendingServerDraft] = useState<ServerDraft | null>(null);

	// refs for tracking
	const userHasTypedRef = useRef(false);
	const lastTaskIdRef = useRef(taskId);

	// stable refs for draft sync callbacks
	const latestQueueRef = useRef<QueueItem[]>([]);
	const latestMessageRef = useRef('');
	latestQueueRef.current = queueItems;
	latestMessageRef.current = message;

	// draft sync handles all server persistence
	const draftSync = useDraftSync({
		taskId,
		getLocalState: () => ({
			queue: latestQueueRef.current,
			message: latestMessageRef.current,
		}),
		isSaveBlocked: pendingServerDraft !== null,
		onServerDraftReceived: (draft) => {
			//
			const localMessage = latestMessageRef.current;
			const localQueue = latestQueueRef.current;
			const isLocalEmpty = !localMessage.trim() && localQueue.length === 0;
			const isServerEmpty = !draft.message.trim() && draft.queue.length === 0;
			const isSameAsLocal = areDraftsEqual(localQueue, localMessage, draft);

			if (isServerEmpty || isSameAsLocal) return;

			if (isLocalEmpty && !userHasTypedRef.current) {
				// auto-populate: user hasn't touched anything
				setQueueItems(draft.queue);
				setMessageState(draft.message);
			} else if (userHasTypedRef.current) {
				// conflict: user has typed, show restore option
				setPendingServerDraft(draft);
			}
		},
	});

	// handle task change: reset local state
	if (taskId !== lastTaskIdRef.current) {
		draftSync.cancel();
		setQueueItems([]);
		setMessageState('');
		setPendingServerDraft(null);
		userHasTypedRef.current = false;
		lastTaskIdRef.current = taskId;
	}

	// convert to EnqueuedSkill format with stable IDs
	const queue = useMemo(() => {
		//
		return queueItems.map(
			(item, index): EnqueuedSkill => ({
				id: `${item.skillKey}-${index}`,
				skillKey: item.skillKey,
				args: item.args,
				enqueuedAt: Date.now(),
			}),
		);
	}, [queueItems]);

	const isEmpty = queueItems.length === 0 && !message.trim();

	const restoreServerDraft = useCallback(() => {
		//
		if (!pendingServerDraft) return;

		setQueueItems(pendingServerDraft.queue);
		setMessageState(pendingServerDraft.message);
		setPendingServerDraft(null);
		userHasTypedRef.current = true;
		draftSync.save(pendingServerDraft.queue, pendingServerDraft.message);
	}, [pendingServerDraft, draftSync]);

	const dismissServerDraft = useCallback(() => {
		//
		setPendingServerDraft(null);
		draftSync.save(queueItems, message);
	}, [queueItems, message, draftSync]);

	const enqueue = useCallback(
		(skill: SkillToEnqueue, options?: { clearMessage?: boolean }): boolean => {
			//
			if (queueItems.length >= MAX_QUEUE_SIZE) {
				toast.error(`Queue is full (max ${MAX_QUEUE_SIZE} actions)`);
				return false;
			}

			userHasTypedRef.current = true;
			const newQueue = queueItems.concat({ skillKey: skill.skillKey, args: skill.args });
			setQueueItems(newQueue);

			const newMessage = options?.clearMessage ? '' : message;
			if (options?.clearMessage) {
				setMessageState('');
			}

			if (!pendingServerDraft) {
				draftSync.save(newQueue, newMessage);
			}

			return true;
		},
		[queueItems, message, pendingServerDraft, draftSync],
	);

	const dequeue = useCallback(
		(id: string) => {
			//
			setQueueItems((prev) => {
				const index = prev.findIndex((_, i) => `${prev[i]?.skillKey}-${i}` === id);
				if (index === -1) return prev;

				const newQueue = prev.filter((_, i) => i !== index);

				if (!pendingServerDraft) {
					draftSync.save(newQueue, message);
				}

				return newQueue;
			});
		},
		[message, pendingServerDraft, draftSync],
	);

	const setMessage = useCallback(
		(newMessage: string) => {
			//
			userHasTypedRef.current = true;
			setMessageState(newMessage);

			if (!pendingServerDraft) {
				draftSync.save(queueItems, newMessage);
			}
		},
		[queueItems, pendingServerDraft, draftSync],
	);

	const clear = useCallback(() => {
		//
		setQueueItems([]);
		setMessageState('');
		setPendingServerDraft(null);
		userHasTypedRef.current = false;
		draftSync.clear();
	}, [draftSync]);

	const clearQueue = useCallback(() => {
		//
		setQueueItems([]);

		if (!pendingServerDraft) {
			draftSync.save([], message);
		}
	}, [message, pendingServerDraft, draftSync]);

	const submit = useCallback(
		async (task: Doc<'tasks'>) => {
			//
			const skills = buildFinalSkills(queue, message, task);
			if (skills.length === 0) return;

			await act({ taskId, skills, shouldReopen: true }, { onSuccess: () => clear() });
		},
		[taskId, queue, message, act, clear],
	);

	const value: ComposerContextValue = {
		queue,
		message,
		isEmpty,
		pendingServerDraft,
		restoreServerDraft,
		dismissServerDraft,
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

function areDraftsEqual(queueItems: QueueItem[], message: string, draft: ServerDraft): boolean {
	//
	if (message !== draft.message) return false;
	if (queueItems.length !== draft.queue.length) return false;

	return queueItems.every((item, index) => {
		const draftItem = draft.queue[index];
		if (!draftItem) return false;
		if (item.skillKey !== draftItem.skillKey) return false;
		return areArgsEqual(item.args, draftItem.args);
	});
}

function areArgsEqual(left: Record<string, unknown>, right: Record<string, unknown>): boolean {
	//
	return safeStringify(left) === safeStringify(right);
}

function safeStringify(value: Record<string, unknown>): string {
	//
	try {
		return JSON.stringify(value);
	} catch {
		return '';
	}
}
