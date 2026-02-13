import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { track } from '@vercel/analytics/react';
import { Id } from 'convex/_generated/dataModel';
import { api } from 'convex/_generated/api';
import { BasicError } from '~/components/BasicError';
import { CompositionFrame } from '~/components/CompositionFrame';
import { Loading } from '~/components/Loading';

const errorText = 'Failed to load or render this action.';

export const Route = createFileRoute('/action_/$id')({
	component: RouteComponent,
	errorComponent: () => <BasicError text={errorText} />,
});

function isActionId(value: string | undefined): value is Id<'actions'> {
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

	if (!isActionId(id)) return <BasicError text={errorText} />;

	return <ActionRouteRenderer actionId={id} />;
}

function ActionRouteRenderer({ actionId }: { actionId: Id<'actions'> }) {
	//
	const query = convexQuery(api.action.findOne, { actionId });
	const { data: action, isLoading, isError } = useSuspenseQuery(query);

	if (isLoading) return <Loading className="h-svh" />;
	if (isError) return <BasicError text={errorText} />;

	if (action.skillKey !== 'render') return <BasicError text={errorText} />;
	if (action.status !== 'succeeded') return <BasicError text={errorText} />;

	return <CompositionFrame code={action.result?.text} title="Rendered Composition" errorText={errorText} />;
}
