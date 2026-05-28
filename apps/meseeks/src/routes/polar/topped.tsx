import { createFileRoute } from '@tanstack/react-router';

// react-doctor-disable-next-line react-doctor/only-export-components -- TanStack Router file routes must export Route.
export const Route = createFileRoute('/polar/topped')({
	component: RouteComponent,
});

export function RouteComponent() {
	//
	const { checkout_id } = Route.useSearch();

	return <div>Successfully topped up! Checkout ID: {checkout_id}</div>;
}
