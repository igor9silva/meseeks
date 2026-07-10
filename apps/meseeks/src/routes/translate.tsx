import { createFileRoute } from '@tanstack/react-router';
import { ProPlaceholder } from '~/components/reactor/ProPlaceholder';

export const Route = createFileRoute('/translate')({
	component: () => <ProPlaceholder title="Translate" />,
});
