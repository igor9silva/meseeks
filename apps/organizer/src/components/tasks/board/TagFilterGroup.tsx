import { cn } from '@pro/ui';
import { formatTagGroupLabel } from '~/lib/taskTags';
import type { ExplorerFacets } from '../taskExplorerTypes';

export function TagFilterGroup({
	group,
	includedTags,
	excludedTags,
	onTagFilterCycle,
}: {
	group: ExplorerFacets['tagGroups'][number];
	includedTags: string[];
	excludedTags: string[];
	onTagFilterCycle: (tag: string) => void;
}) {
	//
	return (
		<div className="flex min-w-0 items-start gap-2">
			<div className="flex h-7 w-28 shrink-0 items-center text-xs text-muted-foreground">
				{formatTagGroupLabel(group.key)}
			</div>
			<div className="flex max-h-40 flex-1 flex-wrap gap-1 overflow-auto">
				{group.entries.map((entry) => {
					const isIncluded = includedTags.includes(entry.tag);
					const isExcluded = excludedTags.includes(entry.tag);

					return (
						<button
							key={entry.tag}
							type="button"
							aria-pressed={isIncluded || isExcluded}
							title={entry.tag}
							onClick={() => onTagFilterCycle(entry.tag)}
							className={cn(
								'inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs transition-colors',
								isIncluded
									? 'border-emerald-400/70 bg-emerald-400/15 text-emerald-100'
									: 'border-border/80 bg-background text-foreground/80 hover:border-foreground/40 hover:text-foreground',
								isExcluded && 'border-red-400/70 bg-red-400/15 text-red-100',
							)}
						>
							{entry.value}
							<span className="tabular-nums opacity-70">{entry.count}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
