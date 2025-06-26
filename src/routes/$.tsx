import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { track } from '@vercel/analytics/react';
import { api } from 'convex/_generated/api';
import { z } from 'zod';
import { BasicError } from '~/components/BasicError';
import MDX from '~/components/ui/mdx';
import { useSplatParams } from '~/hooks/useSplatParams';

const searchSchema = z.object({
	q: z.string().optional(),
	isBudgetDrawerOpen: z.boolean().optional(),
	debug: z.boolean().optional(),
});

export const Route = createFileRoute('/$')({
	component: MDXPage,
	errorComponent: () => <BasicError text="Not found (or something else went wrong)." />,
	validateSearch: searchSchema,
});

function MDXPage() {
	//
	const params = useSplatParams();

	const slug = params.slug || 'list';
	const pageQuery = convexQuery(api.components.public.findOneBySlug, { slug });
	const { data: page } = useSuspenseQuery(pageQuery);

	// prepend the taskId to the body so that MDX can read it
	const taskId = params.taskId || page.defaultTaskId || 'inbox';
	const body = `export const taskId = '${taskId}';\n\n${page.body}`;

	track('$', {
		slug,
		taskId,
	});

	return <MDX text={body} shouldRenderComponents={true} />;
}
