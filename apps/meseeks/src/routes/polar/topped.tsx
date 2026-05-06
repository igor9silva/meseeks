import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/polar/topped')({
	component: RouteComponent,
});

function RouteComponent() {
	//
	const { checkout_id } = Route.useSearch();

	return <div>Successfully topped up! Checkout ID: {checkout_id}</div>;
}
