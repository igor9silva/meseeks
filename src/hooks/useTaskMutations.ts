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

export function useSay() {
	//
	const act = useMutation(api.action.public.act);

	const mutation = useTanStackMutation({
		mutationFn: async ({
			taskId,
			message,
			shouldReopen = true,
		}: {
			taskId: Id<'tasks'>;
			message: string;
			shouldReopen?: boolean;
		}) => {
			//
			return await act({
				taskId,
				skillKey: 'say',
				args: { message },
				shouldReopen,
			});
		},
	});

	return {
		say: mutation.mutate,
		...mutation,
	};
}

export function useRequestIteration() {
	//
	const act = useMutation(api.action.public.act);

	const mutation = useTanStackMutation({
		mutationFn: async ({
			taskId, //
		}: {
			taskId: Id<'tasks'>;
		}) => {
			//
			return await act({
				taskId,
				skillKey: 'requestIteration',
				args: {},
			});
		},
	});

	return {
		requestIteration: mutation.mutate,
		...mutation,
	};
}

export function useStop() {
	//
	const act = useMutation(api.action.public.act);

	const mutation = useTanStackMutation({
		mutationFn: async ({
			taskId, //
		}: {
			taskId: Id<'tasks'>;
		}) => {
			//
			return await act({
				taskId,
				skillKey: 'stop',
				args: {},
			});
		},
	});

	return {
		stop: mutation.mutate,
		...mutation,
	};
}

export function useApproveBlockingAction() {
	//
	const approveBlocking = useMutation(api.action.public.approveBlockingAction);

	const mutation = useTanStackMutation({
		mutationFn: async ({
			taskId, //
		}: {
			taskId: Id<'tasks'>;
		}) => {
			//
			return await approveBlocking({ taskId });
		},
	});

	return {
		approveBlockingAction: mutation.mutate,
		...mutation,
	};
}

export function useIncreaseBudget() {
	//
	const act = useMutation(api.action.public.act);

	const mutation = useTanStackMutation({
		mutationFn: async ({
			taskId,
			amount,
			shouldIterate,
			shouldReopen = true,
		}: {
			taskId: Id<'tasks'>;
			amount: bigint;
			shouldIterate?: boolean;
			shouldReopen?: boolean;
		}) => {
			//
			return await act({
				taskId,
				skillKey: 'increaseBudget',
				args: { amount, shouldIterate },
				shouldReopen,
			});
		},
	});

	return {
		increaseBudget: mutation.mutate,
		...mutation,
	};
}

export function useDecreaseBudget() {
	//
	const act = useMutation(api.action.public.act);

	const mutation = useTanStackMutation({
		mutationFn: async ({
			taskId,
			amount,
			shouldReopen = false,
		}: {
			taskId: Id<'tasks'>;
			amount: bigint;
			shouldReopen?: boolean;
		}) => {
			//
			return await act({
				taskId,
				skillKey: 'decreaseBudget',
				args: { amount },
				shouldReopen,
			});
		},
	});

	return {
		decreaseBudget: mutation.mutate,
		...mutation,
	};
}

export function useTaskMutations() {
	//
	const act = useMutation(api.action.public.act);
	const authorize = useMutation(api.action.public.authorize);
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
		scheduleIteration,
		approveAction,
		rejectAction,
		setPreferredIntelligence,
	};
}
