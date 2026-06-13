import { createFileRoute } from '@tanstack/react-router';
import { handler } from 'lib/auth-server';

const routeOptions = {
	component: () => null,
	server: {
		handlers: {
			GET: ({ request }: { request: Request }) => handler(request),
			POST: ({ request }: { request: Request }) => handler(request),
		},
	},
};

export const Route = createFileRoute('/api/auth/$')(routeOptions);
