import { Link } from '@tanstack/react-router';
import type { Doc } from 'convex/_generated/dataModel';
import { Button } from '@reactor/ui/button';
import { normalizePath } from './path';

export function ActionReference({
	actions,
	onSelectAction,
	value,
}: {
	actions?: Array<Doc<'actions'>>;
	onSelectAction?: (actionId: string) => void;
	value: string;
}) {
	//
	const action = actions?.find((item) => item._id === value);

	if (!action || !onSelectAction) return <span className="font-mono text-xs break-all">{value}</span>;

	return (
		<Button
			type="button"
			variant="link"
			className="h-auto min-w-0 justify-start p-0 text-left font-mono text-xs whitespace-normal break-all"
			onClick={() => onSelectAction(action._id)}
		>
			{value}
		</Button>
	);
}

export function FileReference({ path, value }: { path: string; value: string }) {
	//
	return (
		<Button
			asChild
			variant="link"
			className="h-auto min-w-0 justify-start p-0 text-left font-mono text-xs whitespace-normal break-all"
		>
			<Link to="/$" params={{ _splat: normalizePath(path) }}>
				{value}
			</Link>
		</Button>
	);
}
