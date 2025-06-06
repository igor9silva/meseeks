import { createFileRoute } from '@tanstack/react-router';
import { SubscribePage } from '~/components/subscribe/SubscribePage';

export const Route = createFileRoute('/subscribe')({
	component: () => <SubscribePage route={Route} />,
});
