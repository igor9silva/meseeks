import { Button } from '@reactor/ui';
import { useAction, useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import type { Id } from 'convex/_generated/dataModel';
import { Plus, Zap } from 'lucide-react';
import { defaultTriggerSource } from './constants';
import { Section } from './Section';
import { StatusPill } from './StatusPill';
import { formatTime } from './utils';

interface Props {
	//
	directory: Id<'files'>;
	onDone: (message: string) => void;
}

export function TriggerPanel({ directory, onDone }: Props) {
	//
	const triggers = useQuery(api.triggers.listTriggers, { directory });
	const act = useAction(api.reactor.act);

	const createExample = async () => {
		//
		await act({
			directory,
			skillKey: 'createTriggerExample',
			args: {
				name: 'example.js',
				content: defaultTriggerSource,
			},
		});
		onDone('Trigger file created.');
	};

	return (
		<Section title="Trigger View" icon={<Zap className="size-3.5" />}>
			<div className="mb-2 flex justify-end">
				<Button type="button" size="sm" variant="outline" className="rounded" onClick={createExample}>
					<Plus className="size-4" />
					Example
				</Button>
			</div>
			<div className="grid gap-1">
				{(triggers ?? []).map((trigger) => (
					<div key={trigger.file._id} className="rounded border border-border px-2 py-2 text-xs">
						<div className="mb-1 flex items-center justify-between gap-2">
							<span className="truncate font-mono">{trigger.file.path}</span>
							<StatusPill status={trigger.index?.status ?? 'not indexed'} />
						</div>
						<div className="text-muted-foreground">
							run {trigger.index?.runCount ?? 0} · last {formatTime(trigger.index?.lastRunAt)}
						</div>
						{trigger.index?.lastError && <div className="mt-1 text-red-600">{trigger.index.lastError}</div>}
					</div>
				))}
				{triggers?.length === 0 && (
					<div className="rounded border border-dashed border-border p-3 text-xs text-muted-foreground">
						no trigger files
					</div>
				)}
			</div>
		</Section>
	);
}
