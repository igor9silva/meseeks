import { convexQuery } from '@convex-dev/react-query';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { track } from '@vercel/analytics/react';
import { Id } from 'convex/_generated/dataModel';
import { isNonEmptyString } from 'lib/guards';
import { api } from 'convex/_generated/api';
import { BasicError } from '~/components/BasicError';
import { CompositionFrame } from '~/components/CompositionFrame';
import { Loading } from '~/components/Loading';

const errorText = 'Failed to load or render this action.';

// react-doctor-disable-next-line react-doctor/only-export-components -- TanStack Router file routes must export Route.
export const Route = createFileRoute('/action_/$id')({
	component: RouteComponent,
	errorComponent: () => <BasicError text={errorText} />,
});

function isActionId(value: string | undefined): value is Id<'actions'> {
	//
	return isNonEmptyString(value);
}

export function RouteComponent() {
	//
	const { id } = Route.useParams();

	track('action/$id', {
		actionId: id,
		mode: 'direct-link',
	});

	if (!isActionId(id)) return <BasicError text={errorText} />;

	return <ActionRouteRenderer actionId={id} />;
}

export function ActionRouteRenderer({ actionId }: { actionId: Id<'actions'> }) {
	//
	const query = convexQuery(api.action.findOne, { actionId });
	const { data: action, isPending, isError } = useQuery(query);

	if (isPending) return <Loading className="h-svh" />;
	if (isError) return <BasicError text={errorText} />;
	if (!action) return <BasicError text={errorText} />;

	if (action.skillKey !== 'render') return <BasicError text={errorText} />;
	if (action.status !== 'succeeded') return <BasicError text={errorText} />;

	return <CompositionFrame code={action.result?.text} title="Rendered Composition" errorText={errorText} />;
}
