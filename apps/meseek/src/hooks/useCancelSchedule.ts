import { useMutation as useTanStackMutation } from '@tanstack/react-query';
import { useMutation } from 'convex/react';
import { type Id } from 'convex/_generated/dataModel';
import { api } from 'convex/_generated/api';

export function useCancelSchedule() {
	//
	const cancelSchedule = useMutation(api.schedules.cancel);

	const mutation = useTanStackMutation({
		mutationFn: async ({ scheduleId }: { scheduleId: Id<'schedules'> }) => {
			//
			return await cancelSchedule({ scheduleId });
		},
		onError: (error) => {
			console.warn('failed to cancel schedule', error);
		},
	});

	return {
		cancelSchedule: mutation.mutate,
		isCancelingSchedule: mutation.isPending,
		...mutation,
	};
}
