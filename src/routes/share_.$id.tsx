import { convexQuery } from '@convex-dev/react-query';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Id } from 'convex/_generated/dataModel';
import { api } from 'convex/_generated/api';
import { BasicError } from '~/components/BasicError';
import { CompositionFrame } from '~/components/CompositionFrame';
import { Loading } from '~/components/Loading';

const errorText = 'Failed to load or render this composition.';

export const Route = createFileRoute('/share_/$id')({
	component: RouteComponent,
	errorComponent: () => <BasicError text={errorText} />,
});

function isComponentId(value: string | undefined): value is Id<'components'> {
	//
	return Boolean(value && value.length > 0);
}

function RouteComponent() {
	//
	const { id } = Route.useParams();

	if (!isComponentId(id)) return <BasicError text={errorText} />;

	return <SharedComposition componentId={id} />;
}

function SharedComposition({ componentId }: { componentId: Id<'components'> }) {
	//
	const query = convexQuery(api.components.findPublicById, { componentId });
	const { data: composition, isPending, isError } = useQuery(query);

	if (isPending) return <Loading className="h-svh" />;
	if (isError) return <BasicError text={errorText} />;
	if (!composition) return <BasicError text={errorText} />;

	return <CompositionFrame code={composition.body} title="Shared Composition" errorText={errorText} />;
}
