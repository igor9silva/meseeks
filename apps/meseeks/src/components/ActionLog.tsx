import { cn } from '@reactor/ui';
import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import type { Id } from 'convex/_generated/dataModel';
import { Bot } from 'lucide-react';
import { Section } from './Section';
import { StatusPill } from './StatusPill';
import { authorLabel, formatTime } from './utils';

interface Props {
	//
	directory: Id<'files'>;
	selectedAction?: Id<'actions'>;
	onSelectAction: (action: Id<'actions'>) => void;
}

export function ActionLog({ directory, selectedAction, onSelectAction }: Props) {
	//
	const actions = useQuery(api.actions.listActions, { directory });
	const selected = selectedAction ?? actions?.[0]?._id;
	const details = useQuery(api.actions.listActionDetails, selected ? { action: selected } : 'skip');

	return (
		<Section title="Action Log" icon={<Bot className="size-3.5" />} className="max-h-[360px] overflow-auto">
			<div className="grid gap-1">
				{(actions ?? []).map((action) => (
					<button
						type="button"
						key={action._id}
						className={cn(
							'rounded border border-border px-2 py-2 text-left text-xs hover:bg-muted',
							selected === action._id && 'bg-muted',
						)}
						onClick={() => onSelectAction(action._id)}
					>
						<div className="mb-1 flex items-center justify-between gap-2">
							<span className="font-semibold">{action.skillKey}</span>
							<StatusPill status={action.status} />
						</div>
						<div className="text-muted-foreground">
							{authorLabel(action.author)} · {formatTime(action.createdAt)}
						</div>
						{action.result && <ActionResultPreview file={action.result} />}
						{action.error && <div className="mt-1 line-clamp-2 text-red-600">{action.error}</div>}
					</button>
				))}
			</div>
			<div className="mt-3 rounded border border-border bg-muted/30 p-2">
				<div className="mb-1 text-xs font-medium text-muted-foreground">Action Details</div>
				<pre className="max-h-56 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed">
					{details ? JSON.stringify(details, null, 2) : '[]'}
				</pre>
			</div>
		</Section>
	);
}

function ActionResultPreview({ file }: { file: Id<'files'> }) {
	//
	const result = useQuery(api.files.getFileContent, { file });
	const content = result?.content?.trim();

	if (!content) {
		return <div className="mt-1 line-clamp-2 text-foreground/80">result file saved</div>;
	}

	return <div className="mt-1 line-clamp-2 text-foreground/80">{content}</div>;
}
