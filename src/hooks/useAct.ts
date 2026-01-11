import { useMutation as useTanStackMutation } from '@tanstack/react-query';
import { api } from 'convex/_generated/api';
import { useMutation } from 'convex/react';

export function useAct() {
	//
	const act = useMutation(api.action.public.act);

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
