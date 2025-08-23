import { useMutation as useTanStackMutation } from '@tanstack/react-query';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { asBigInt } from 'convex/lib/money';
import { useMutation } from 'convex/react';
import { modelsSchema } from 'convex/schemas/skillSchema';
import { z } from 'zod';
import { BudgetStep } from '~/components/ui/budget-selector';

export function useAddTask() {
	//
	const addTask = useMutation(api.tasks.public.add);

	const mutation = useTanStackMutation({
		mutationFn: async ({
			message,
			initialFunds,
			intelligence,
		}: {
			message: string;
			initialFunds: BudgetStep;
			intelligence: z.infer<typeof modelsSchema> | undefined;
		}) => {
			//
			return await addTask({
				message: message.trim(),
				initialFunds: asBigInt({ dollars: initialFunds }),
				preferredIntelligence: intelligence,
			});
		},
	});

	return {
		addTask: mutation.mutate,
		...mutation,
	};
}

export function useTaskMutations() {
	//
	const act = useMutation(api.action.public.act);
	const authorize = useMutation(api.action.public.authorize);
	const approveBlocking = useMutation(api.action.public.approveBlockingAction);
	const setPreferredIntelligenceMutation = useMutation(api.tasks.public.setPreferredIntelligence);

	const say = ({
		taskId, //
		message,
	}: {
		taskId: Id<'tasks'>;
		message: string;
	}) => {
		return act({
			taskId,
			skillKey: 'say',
			args: { message },
			shouldReopen: true,
		});
	};

	const stop = ({
		taskId, //
	}: {
		taskId: Id<'tasks'>;
	}) => {
		return act({
			taskId,
			skillKey: 'stop',
			args: {},
		});
	};

	const updateInstructions = ({
		taskId, //
		title,
		instructions,
		availableSkills,
	}: {
		taskId: Id<'tasks'>;
		title?: string;
		instructions?: string;
		availableSkills?: string[];
	}) => {
		return act({
			taskId,
			skillKey: 'updateInstructions',
			args: { title, instructions, availableSkills },
			shouldReopen: true,
		});
	};

	const resolve = ({
		taskId, //
	}: {
		taskId: Id<'tasks'>;
	}) => {
		return act({
			taskId,
			skillKey: 'resolve',
			args: {},
		});
	};

	const discard = ({
		taskId, //
	}: {
		taskId: Id<'tasks'>;
	}) => {
		return act({
			taskId,
			skillKey: 'discard',
			args: {},
		});
	};

	const reopen = ({
		taskId, //
	}: {
		taskId: Id<'tasks'>;
	}) => {
		return act({
			taskId,
			skillKey: 'reopen',
			args: {},
		});
	};

	const increaseBudget = ({
		taskId, //
		amount,
		shouldIterate,
	}: {
		taskId: Id<'tasks'>;
		amount: bigint;
		shouldIterate?: boolean;
	}) => {
		return act({
			taskId,
			skillKey: 'increaseBudget',
			args: { amount, shouldIterate },
			shouldReopen: true,
		});
	};

	const decreaseBudget = ({
		taskId, //
		amount,
	}: {
		taskId: Id<'tasks'>;
		amount: bigint;
	}) => {
		return act({
			taskId,
			skillKey: 'decreaseBudget',
			args: { amount },
			shouldReopen: false,
		});
	};

	const requestIteration = ({
		taskId, //
	}: {
		taskId: Id<'tasks'>;
	}) => {
		return act({
			taskId,
			skillKey: 'requestIteration',
			args: {},
		});
	};

	const scheduleIteration = ({
		taskId,
		scheduleType,
		scheduledAt,
		cronExpression,
		timeZone,
		instructions,
	}: {
		taskId: Id<'tasks'>;
		scheduleType: 'one-time' | 'recurring';
		scheduledAt?: string;
		cronExpression?: string;
		timeZone: string;
		instructions?: string;
	}) => {
		return act({
			taskId,
			skillKey: 'schedule',
			args: {
				scheduleType,
				scheduledAt,
				cronExpression,
				timeZone,
				instructions,
			},
		});
	};

	const approveAction = ({
		taskId, //
		actionId,
	}: {
		taskId: Id<'tasks'>;
		actionId: Id<'actions'>;
	}) => {
		return authorize({
			taskId,
			actionId,
			hasApproved: true,
		});
	};

	const rejectAction = ({
		taskId, //
		actionId,
	}: {
		taskId: Id<'tasks'>;
		actionId: Id<'actions'>;
	}) => {
		return authorize({
			taskId,
			actionId,
			hasApproved: false,
		});
	};

	const approveBlockingAction = ({
		taskId, //
	}: {
		taskId: Id<'tasks'>;
	}) => {
		return approveBlocking({
			taskId,
		});
	};

	const setPreferredIntelligence = ({
		taskId, //
		preferredIntelligence,
	}: {
		taskId: Id<'tasks'>;
		preferredIntelligence: z.infer<typeof modelsSchema>;
	}) => {
		return setPreferredIntelligenceMutation({ taskId, preferredIntelligence });
	};

	return {
		say,
		stop,
		updateInstructions,
		resolve,
		discard,
		reopen,
		increaseBudget,
		decreaseBudget,
		requestIteration,
		scheduleIteration,
		approveAction,
		rejectAction,
		approveBlockingAction,
		setPreferredIntelligence,
	};
}
