// loads tanstack start's route-option augmentation for server handlers.
import '@tanstack/react-start';
import { createFileRoute } from '@tanstack/react-router';
import { handler } from 'lib/auth-server';

export const Route = createFileRoute('/api/auth/$')({
	server: {
		handlers: {
			GET: ({ request }) => handler(request),
			POST: ({ request }) => handler(request),
		},
	},
});
