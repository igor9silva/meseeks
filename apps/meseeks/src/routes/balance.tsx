import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/balance')({
	beforeLoad: ({ search }) => {
		throw redirect({
			to: '/wallet',
			search: search as { tab?: 'transactions' | 'active-tasks' },
			replace: true,
		});
	},
});
