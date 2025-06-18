import { createFileRoute } from '@tanstack/react-router';
import { MonacoDemo } from '~/components/MonacoDemo';

export const Route = createFileRoute('/monaco-demo')({
	component: MonacoDemoPage,
});

function MonacoDemoPage() {
	//
	return (
		<div className="container mx-auto">
			<MonacoDemo />
		</div>
	);
}
