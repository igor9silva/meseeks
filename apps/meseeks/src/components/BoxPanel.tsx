import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import type { Id } from 'convex/_generated/dataModel';
import { Box } from 'lucide-react';
import { Section } from './Section';
import { StatusPill } from './StatusPill';

interface Props {
	//
	directory: Id<'files'>;
}

export function BoxPanel({ directory }: Props) {
	//
	const box = useQuery(api.boxes.getBox, { directory });

	return (
		<Section title="Box Panel" icon={<Box className="size-3.5" />}>
			{box ? (
				<div className="grid gap-2 text-xs">
					<div className="flex items-center justify-between gap-2">
						<span>status</span>
						<StatusPill status={box.status} />
					</div>
					<div className="flex items-center justify-between gap-2">
						<span>provider</span>
						<span className="font-mono">{box.providerSandboxId ?? 'not created'}</span>
					</div>
					<div>
						<div className="mb-1 text-muted-foreground">changed files</div>
						<pre className="max-h-24 overflow-auto rounded border border-border bg-muted/30 p-2">
							{JSON.stringify(box.lastChangedFiles ?? [], null, 2)}
						</pre>
					</div>
					<div>
						<div className="mb-1 text-muted-foreground">logs</div>
						<pre className="max-h-32 overflow-auto rounded border border-border bg-muted/30 p-2 whitespace-pre-wrap">
							{box.lastLogs ?? ''}
						</pre>
					</div>
				</div>
			) : (
				<div className="rounded border border-dashed border-border p-3 text-xs text-muted-foreground">
					no box yet
				</div>
			)}
		</Section>
	);
}
