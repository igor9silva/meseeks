import { useMutation as useTanStackMutation } from '@tanstack/react-query';
import { useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';

export function useAct() {
	//
	const act = useMutation(api.actions.act);

	type Args = Parameters<typeof act>[0];
	type Action = Args['actions'][number];

	const mutation = useTanStackMutation({
		mutationFn: async (actions: Array<Action>) => {
			return await act({ actions });
		},
	});

	return {
		...mutation,
		act: mutation.mutateAsync,
		isActing: mutation.isPending,
	};
}
