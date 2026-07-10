import { Link } from '@tanstack/react-router';
import { Button } from '@reactor/ui/button';

export function ProPlaceholder({ title }: { title: string }) {
	//
	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
			<h1 className="text-xl font-semibold">{title}</h1>
			<Button asChild>
				<Link to="/$" params={{ _splat: '' }}>
					Open PRO
				</Link>
			</Button>
		</div>
	);
}
