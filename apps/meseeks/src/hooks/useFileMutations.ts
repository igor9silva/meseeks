import { useMutation as useTanStackMutation } from '@tanstack/react-query';
import type { Id } from 'convex/_generated/dataModel';
import { asBigInt } from 'lib/money';
import { useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';

export function useAddFile() {
	//
	const addFile = useMutation(api.files.add);

	const mutation = useTanStackMutation({
		mutationFn: async ({
			message,
			initialFunds,
			intelligence,
			loopKey,
		}: {
			message: string;
			initialFunds: number;
			intelligence?: string;
			loopKey?: string | null;
		}) => {
			//
			return await addFile({
				message: message.trim(),
				initialFunds: asBigInt({ dollars: initialFunds }),
				intelligence,
				loopKey,
			});
		},
	});

	return {
		addFile: mutation.mutate,
		isAdding: mutation.isPending,
		...mutation,
	};
}

/**
 * @deprecated use useAct + useComposer for batched skill submission
 */
export function useSay() {
	//
	const act = useMutation(api.actions.act);

	const mutation = useTanStackMutation({
		mutationFn: async ({
			fileId, //
			message,
			shouldReopen = true,
		}: {
			fileId: Id<'files'>;
			message: string;
			shouldReopen?: boolean;
		}) => {
			//
			return await act({
				fileId,
				skills: [
					{ skillKey: 'say', args: { message } }, //
				],
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

export function useStop() {
	//
	const act = useMutation(api.actions.act);

	const mutation = useTanStackMutation({
		mutationFn: async ({
			fileId, //
		}: {
			fileId: Id<'files'>;
		}) => {
			//
			return await act({
				fileId,
				skills: [
					{ skillKey: 'interrupt', args: {} }, //
				],
			});
		},
	});

	return {
		stop: mutation.mutate,
		isStopping: mutation.isPending,
		...mutation,
	};
}

export function useUpdateBudget() {
	//
	const act = useMutation(api.actions.act);

	const mutation = useTanStackMutation({
		mutationFn: async ({
			fileId, //
			amount,
			shouldReopen = false,
		}: {
			fileId: Id<'files'>;
			amount: bigint;
			shouldReopen?: boolean;
		}) => {
			//
			return await act({
				fileId,
				skills: [
					{ skillKey: 'updateBudget', args: { amount } }, //
				],
				shouldReopen,
			});
		},
	});

	return {
		updateBudget: mutation.mutate,
		isChangingEnergy: mutation.isPending,
		...mutation,
	};
}

/**
 * @deprecated use useAct + useComposer for batched skill submission
 */
export function useResolve() {
	//
	const act = useMutation(api.actions.act);

	const mutation = useTanStackMutation({
		mutationFn: async ({
			fileId, //
		}: {
			fileId: Id<'files'>;
		}) => {
			//
			return await act({
				fileId,
				skills: [
					{
						skillKey: 'updateFileMetadata',
						args: {
							tags: [
								{ key: 'kind', value: 'task' },
								{ key: 'status', value: 'done' },
							],
						},
					},
				],
			});
		},
	});

	return {
		resolve: mutation.mutate,
		isResolving: mutation.isPending,
		...mutation,
	};
}

/**
 * @deprecated use useAct + useComposer for batched skill submission
 */
export function useDiscard() {
	//
	const act = useMutation(api.actions.act);

	const mutation = useTanStackMutation({
		mutationFn: async ({
			fileId, //
		}: {
			fileId: Id<'files'>;
		}) => {
			//
			return await act({
				fileId,
				skills: [
					{
						skillKey: 'updateFileMetadata',
						args: {
							tags: [
								{ key: 'kind', value: 'task' },
								{ key: 'status', value: 'discarded' },
							],
						},
					},
				],
			});
		},
	});

	return {
		discard: mutation.mutate,
		isDiscarding: mutation.isPending,
		...mutation,
	};
}

/**
 * @deprecated use useAct + useComposer for batched skill submission
 */
export function useReopen() {
	//
	const act = useMutation(api.actions.act);

	const mutation = useTanStackMutation({
		mutationFn: async ({
			fileId, //
		}: {
			fileId: Id<'files'>;
		}) => {
			//
			return await act({
				fileId,
				skills: [
					{
						skillKey: 'updateFileMetadata',
						args: {
							tags: [
								{ key: 'kind', value: 'task' },
								{ key: 'status', value: 'active' },
							],
						},
					},
				],
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
	const authorize = useMutation(api.actions.authorize);

	const mutation = useTanStackMutation({
		mutationFn: async ({
			fileId, //
			actionId,
		}: {
			fileId: Id<'files'>;
			actionId: Id<'actions'>;
		}) => {
			//
			return await authorize({
				fileId,
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
	const authorize = useMutation(api.actions.authorize);

	const mutation = useTanStackMutation({
		mutationFn: async ({
			fileId, //
			actionId,
		}: {
			fileId: Id<'files'>;
			actionId: Id<'actions'>;
		}) => {
			//
			return await authorize({
				fileId,
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

export function useUpdateContent() {
	//
	const act = useMutation(api.actions.act);

	const mutation = useTanStackMutation({
		mutationFn: async ({
			fileId, //
			content,
			shouldReopen = true,
		}: {
			fileId: Id<'files'>;
			content: string;
			shouldReopen?: boolean;
		}) => {
			//
			return await act({
				fileId,
				skills: [
					{ skillKey: 'updateFileContent', args: { content } }, //
				],
				shouldReopen,
			});
		},
	});

	return {
		updateContent: mutation.mutate,
		isUpdatingContent: mutation.isPending,
		...mutation,
	};
}

export function useRenameFile() {
	//
	const act = useMutation(api.actions.act);

	const mutation = useTanStackMutation({
		mutationFn: async ({
			fileId, //
			name,
			shouldReopen = true,
		}: {
			fileId: Id<'files'>;
			name: string;
			shouldReopen?: boolean;
		}) => {
			//
			return await act({
				fileId,
				skills: [
					{ skillKey: 'rename', args: { name } }, //
				],
				shouldReopen,
			});
		},
	});

	return {
		renameFile: mutation.mutate,
		isRenamingFile: mutation.isPending,
		...mutation,
	};
}
