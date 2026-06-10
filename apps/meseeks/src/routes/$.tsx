import { createFileRoute, useParams } from '@tanstack/react-router';
import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { BasicError } from '~/components/BasicError';
import { RoutedFileSurface } from '~/components/reactor/RoutedFileSurface';

const searchSchema = z.object({
	q: z.string().optional(),
	isEnergyDrawerOpen: z.boolean().optional(),
	debug: z.boolean().optional(),
});

export const Route = createFileRoute('/$')({
	component: RoutedFilePage,
	errorComponent: () => <BasicError text="Not found (or something else went wrong)." />,
	validateSearch: searchSchema,
});

function RoutedFilePage() {
	//
	const params = useParams({ strict: false });
	const parts = params?._splat?.split('/') ?? [];
	const slug = parts.at(0) || '/';
	const value = parts.at(1);
	if (parts.length > 2) throw new Error('Invalid URL');
	const parsedFile = slug === 'tasks' || slug === 'inbox' ? zid('files').safeParse(value) : undefined;

	return <RoutedFileSurface slug={slug} fileId={parsedFile?.success ? parsedFile.data : undefined} />;
}
