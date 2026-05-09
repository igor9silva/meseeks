import { useMutation as useTanStackMutation } from '@tanstack/react-query';
import { useMutation } from 'convex/react';
import { Id } from 'convex/_generated/dataModel';
import { api } from 'convex/_generated/api';
import { toast } from 'sonner';

function getShareUrl(componentId: Id<'components'>) {
	//
	return `${window.location.origin}/share/${componentId}`;
}

export function useComponentShare() {
	//
	const shareRenderAction = useMutation(api.components.shareRenderAction);

	const mutation = useTanStackMutation({
		mutationFn: async ({ actionId }: { actionId: Id<'actions'> }) => {
			//
			const { componentId } = await shareRenderAction({ actionId });
			const shareUrl = getShareUrl(componentId);

			await navigator.clipboard.writeText(shareUrl);

			return { componentId, shareUrl };
		},
		onSuccess: () => {
			toast.success('Share link copied to clipboard');
		},
		onError: (error) => {
			console.warn('failed to share render action', error);
			toast.error('Failed to create share link');
		},
	});

	return {
		shareComponent: mutation.mutateAsync,
		isSharingComponent: mutation.isPending,
		...mutation,
	};
}
