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
		isAdding: mutation.isPending,
		...mutation,
	};
}

export function useSay() {
	//
	const act = useMutation(api.action.public.act);

	const mutation = useTanStackMutation({
		mutationFn: async ({
			taskId, //
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
		isSaying: mutation.isPending,
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
		isRequestingIteration: mutation.isPending,
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
		isStopping: mutation.isPending,
		...mutation,
	};
}

export function useIncreaseBudget() {
	//
	const act = useMutation(api.action.public.act);

	const mutation = useTanStackMutation({
		mutationFn: async ({
			taskId, //
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
		isIncreasingBudget: mutation.isPending,
		...mutation,
	};
}

export function useDecreaseBudget() {
	//
	const act = useMutation(api.action.public.act);

	const mutation = useTanStackMutation({
		mutationFn: async ({
			taskId, //
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
		isDecreasingBudget: mutation.isPending,
		...mutation,
	};
}

export function useResolve() {
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
				skillKey: 'resolve',
				args: {},
			});
		},
	});

	return {
		resolve: mutation.mutate,
		isResolving: mutation.isPending,
		...mutation,
	};
}

export function useDiscard() {
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
				skillKey: 'discard',
				args: {},
			});
		},
	});

	return {
		discard: mutation.mutate,
		isDiscarding: mutation.isPending,
		...mutation,
	};
}

export function useReopen() {
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
				skillKey: 'reopen',
				args: {},
			});
		},
	});

	return {
		reopen: mutation.mutate,
		isReopening: mutation.isPending,
		...mutation,
	};
}

export function useApproveAction() {
	//
	const authorize = useMutation(api.action.public.authorize);

	const mutation = useTanStackMutation({
		mutationFn: async ({
			taskId, //
			actionId,
		}: {
			taskId: Id<'tasks'>;
			actionId: Id<'actions'>;
		}) => {
			//
			return await authorize({
				taskId,
				actionId,
				hasApproved: true,
			});
		},
	});

	return {
		approveAction: mutation.mutate,
		isApprovingAction: mutation.isPending,
		...mutation,
	};
}

export function useRejectAction() {
	//
	const authorize = useMutation(api.action.public.authorize);

	const mutation = useTanStackMutation({
		mutationFn: async ({
			taskId, //
			actionId,
		}: {
			taskId: Id<'tasks'>;
			actionId: Id<'actions'>;
		}) => {
			//
			return await authorize({
				taskId,
				actionId,
				hasApproved: false,
			});
		},
	});

	return {
		rejectAction: mutation.mutate,
		isRejectingAction: mutation.isPending,
		...mutation,
	};
}

export function useUpdateInstructions() {
	//
	const act = useMutation(api.action.public.act);

	const mutation = useTanStackMutation({
		mutationFn: async ({
			taskId, //
			instructions,
			shouldReopen = true,
		}: {
			taskId: Id<'tasks'>;
			instructions: string;
			shouldReopen?: boolean;
		}) => {
			//
			return await act({
				taskId,
				skillKey: 'updateInstructions',
				args: { instructions },
				shouldReopen,
			});
		},
	});

	return {
		updateInstructions: mutation.mutate,
		isUpdatingInstructions: mutation.isPending,
		...mutation,
	};
}

export function useUpdateTitle() {
	//
	const act = useMutation(api.action.public.act);

	const mutation = useTanStackMutation({
		mutationFn: async ({
			taskId, //
			title,
			shouldReopen = true,
		}: {
			taskId: Id<'tasks'>;
			title: string;
			shouldReopen?: boolean;
		}) => {
			//
			return await act({
				taskId,
				skillKey: 'updateInstructions',
				args: { title },
				shouldReopen,
			});
		},
	});

	return {
		updateTitle: mutation.mutate,
		isUpdatingTitle: mutation.isPending,
		...mutation,
	};
}

export function useUpdateAvailableSkills() {
	//
	const act = useMutation(api.action.public.act);

	const mutation = useTanStackMutation({
		mutationFn: async ({
			taskId, //
			availableSkills,
			shouldReopen = true,
		}: {
			taskId: Id<'tasks'>;
			availableSkills: string[];
			shouldReopen?: boolean;
		}) => {
			//
			return await act({
				taskId,
				skillKey: 'updateInstructions',
				args: { availableSkills },
				shouldReopen,
			});
		},
	});

	return {
		updateAvailableSkills: mutation.mutate,
		isUpdatingAvailableSkills: mutation.isPending,
		...mutation,
	};
}

export function useScheduleIteration() {
	//
	const act = useMutation(api.action.public.act);

	const mutation = useTanStackMutation({
		mutationFn: async ({
			taskId, //
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
			//
			return await act({
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
		},
	});

	return {
		scheduleIteration: mutation.mutate,
		isSchedulingIteration: mutation.isPending,
		...mutation,
	};
}

export function useSetPreferredIntelligence() {
	//
	const setPreferredIntelligenceMutation = useMutation(api.tasks.public.setPreferredIntelligence);

	const mutation = useTanStackMutation({
		mutationFn: async ({
			taskId, //
			preferredIntelligence,
		}: {
			taskId: Id<'tasks'>;
			preferredIntelligence: z.infer<typeof modelsSchema>;
		}) => {
			//
			return await setPreferredIntelligenceMutation({ taskId, preferredIntelligence });
		},
	});

	return {
		setPreferredIntelligence: mutation.mutate,
		isSettingPreferredIntelligence: mutation.isPending,
		...mutation,
	};
}
