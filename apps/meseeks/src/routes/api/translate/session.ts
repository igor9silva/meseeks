import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/translate/session')({
	server: {
		handlers: {
			POST: async () =>
				Response.json(
					{ error: 'Translation sessions are unavailable.' },
					{ status: 410 },
				),
		},
	},
});
