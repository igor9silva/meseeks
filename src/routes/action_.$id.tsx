import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { track } from '@vercel/analytics/react';
import { Id, TableNames } from 'convex/_generated/dataModel';
import { api } from 'convex/_generated/api';
import { BasicError } from '~/components/BasicError';
import { useIframeRenderer } from '~/hooks/useIframeRenderer';
import { TextShimmer } from '~/components/ui/text-shimmer';

const errorText = 'Failed to load or render this action.';

export const Route = createFileRoute('/action_/$id')({
	component: RouteComponent,
	errorComponent: () => <BasicError text={errorText} />,
});

function isNonEmptyString(value: string | undefined): value is string {
	//
	return Boolean(value && value.length > 0);
}

function RouteComponent() {
	//
	const { id } = Route.useParams();

	track('action/$id', {
		actionId: id,
		mode: 'direct-link',
	});

	if (!isNonEmptyString(id)) return <BasicError text={errorText} />;

	const query = convexQuery(api.action.findOne, { actionId: id as Id<'actions'> });
	const { data: action, isLoading, isError } = useSuspenseQuery(query);

	if (isLoading) return <TextShimmer text="Loading..." />;
	if (isError) return <BasicError text={errorText} />;

	if (action.skillKey !== 'render') return <BasicError text={errorText} />;
	if (action.status !== 'succeeded') return <BasicError text={errorText} />;

	const transpiledCode = action.result?.text || '';
	const { dataUrl } = useIframeRenderer({ code: transpiledCode });

	if (!dataUrl) return <BasicError text={errorText} />;

	// TODO: unify all <iframe>
	return (
		<iframe src={dataUrl} title="Rendered Composition" className="fixed inset-0 z-50 h-full w-full border-none" />
	);
}
