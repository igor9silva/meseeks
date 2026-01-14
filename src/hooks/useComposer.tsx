import type { Doc, Id } from 'convex/_generated/dataModel';
import { asBigInt } from 'convex/lib/money';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { EnqueuedSkill, SkillToEnqueue } from '~/components/ActionComposer/types';
import { type ComposerDraft, clearDraft, loadDraft, saveDraft } from '~/lib/composerDrafts';
import { useAct } from './useAct';

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

const MAX_QUEUE_SIZE = 16;
const BUDGET_SKILL_KEYS = ['increaseBudget', 'decreaseBudget'];

type QueueItem = { skillKey: string; args: Record<string, unknown> };

type ComposerProviderProps = {
	taskId: Id<'tasks'>;
	children: React.ReactNode;
};

export function ComposerProvider({ taskId, children }: ComposerProviderProps) {
	//
	const { act, isActing } = useAct();

	// load initial draft synchronously to avoid race conditions
	const initialDraft = useRef<ComposerDraft | null>(null);
	if (initialDraft.current === null) {
		initialDraft.current = loadDraft(taskId) ?? { queue: [], message: '' };
	}

	const [queueItems, setQueueItems] = useState<QueueItem[]>(initialDraft.current.queue);
	const [message, setMessageState] = useState(initialDraft.current.message);
	const idCounterRef = useRef(0);

	// reload draft when taskId changes
	useEffect(() => {
		//
		const draft = loadDraft(taskId);
		setQueueItems(draft?.queue ?? []);
		setMessageState(draft?.message ?? '');
		idCounterRef.current = 0;
	}, [taskId]);

	// save draft whenever state changes (skip first render via taskId dep)
	const isFirstRender = useRef(true);
	useEffect(() => {
		//
		if (isFirstRender.current) {
			isFirstRender.current = false;
			return;
		}
		saveDraft(taskId, { queue: queueItems, message });
	}, [taskId, queueItems, message]);

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

	const enqueue = useCallback(
		(skill: SkillToEnqueue, options?: { clearMessage?: boolean }): boolean => {
			//
			if (queueItems.length >= MAX_QUEUE_SIZE) {
				toast.error(`Queue is full (max ${MAX_QUEUE_SIZE} actions)`);
				return false;
			}

			setQueueItems((prev) => prev.concat({ skillKey: skill.skillKey, args: skill.args }));

			if (options?.clearMessage) {
				setMessageState('');
			}

			return true;
		},
		[queueItems.length],
	);

	const dequeue = useCallback((id: string) => {
		//
		setQueueItems((prev) => {
			const index = prev.findIndex((_, i) => `${prev[i]?.skillKey}-${i}` === id);
			if (index === -1) return prev;
			return prev.filter((_, i) => i !== index);
		});
	}, []);

	const setMessage = useCallback((newMessage: string) => {
		//
		setMessageState(newMessage);
	}, []);

	const clear = useCallback(() => {
		//
		setQueueItems([]);
		setMessageState('');
		clearDraft(taskId);
	}, [taskId]);

	const clearQueue = useCallback(() => {
		//
		setQueueItems([]);
	}, []);

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
