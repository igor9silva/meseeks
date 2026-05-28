import { createFileRoute } from '@tanstack/react-router';

// react-doctor-disable-next-line react-doctor/only-export-components -- TanStack Router file routes must export Route.
export const Route = createFileRoute('/polar/subscribed')({
	component: RouteComponent,
});

export function RouteComponent() {
	//
	const { checkout_id } = Route.useSearch();

	return <div>Successfully subscribed! Checkout ID: {checkout_id}</div>;
}
