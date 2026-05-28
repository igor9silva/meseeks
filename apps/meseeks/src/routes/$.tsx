import { createFileRoute } from '@tanstack/react-router';
import { track } from '@vercel/analytics/react';
import { z } from 'zod/v3';
import { BasicError } from '~/components/BasicError';
import MDX from '~/components/ui/mdx';
import { useComposition } from '~/hooks/query/useComposition';
import { useSplatParams } from '~/hooks/useSplatParams';

const searchSchema = z.object({
	q: z.string().optional(),
	isEnergyDrawerOpen: z.boolean().optional(),
	debug: z.boolean().optional(),
});

// react-doctor-disable-next-line react-doctor/only-export-components -- TanStack Router file routes must export Route.
export const Route = createFileRoute('/$')({
	component: MDXPage,
	errorComponent: () => <BasicError text="Not found (or something else went wrong)." />,
	validateSearch: searchSchema,
});

export function MDXPage() {
	//
	const params = useSplatParams();

	const slug = params.slug || 'list';
	const { composition } = useComposition(slug);

	const taskId = params.taskId || composition.defaultTaskId || 'inbox';

	track('$', {
		slug,
		taskId,
	});

	return <MDX text={composition.body} shouldRenderComponents={true} />;
}
