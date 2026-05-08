import { useMutation as useTanStackMutation } from '@tanstack/react-query';
import { useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';

export function useAct() {
	//
	const act = useMutation(api.action.act);

	const mutation = useTanStackMutation({
		mutationFn: async (args: Parameters<typeof act>[0]) => {
			return await act(args);
		},
	});

	return {
		act: mutation.mutateAsync,
		isActing: mutation.isPending,
		...mutation,
	};
}
