import { createFileRoute, Outlet } from '@tanstack/react-router';
import { z } from 'zod';

// TODO: grab the top-up from the checkout_id and redirect to /top-up/:id

export const Route = createFileRoute('/polar')({
	component: () => (
		<Container>
			<Outlet />
		</Container>
	),
	errorComponent: () => (
		<Container>
			<div>Missing checkout ID</div>
		</Container>
	),
	validateSearch: z.object({
		checkout_id: z.string(),
	}),
});

function Container({ children }: { children: React.ReactNode }) {
	return <div className="flex flex-col items-center justify-center h-full w-full gap-4">{children}</div>;
}
