import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/polar/subscribed')({
	component: RouteComponent,
});

function RouteComponent() {
	//
	const { checkout_id } = Route.useSearch();

	return <div>Successfully subscribed! Checkout ID: {checkout_id}</div>;
}
