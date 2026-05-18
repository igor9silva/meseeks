import { formatTagGroupLabel, getTagGroupLookupKey } from '~/lib/taskTags';
import type { SystemTagGroup } from './systemTagGroups';
import { getTagClassName } from './taskDetailUtils';

export function TaskSystemTags({
	groups,
	selectedTags,
	allTags,
	privateBlurClassName,
	isPending,
	onTagToggle,
}: {
	groups: SystemTagGroup[];
	selectedTags: string[];
	allTags: string[];
	privateBlurClassName: string;
	isPending: boolean;
	onTagToggle: (tag: string) => void;
}) {
	//
	return (
		<div className="mt-3 max-h-36 space-y-2 overflow-auto">
			{groups.map((group) => (
				<div key={getTagGroupLookupKey(group.key)} className="flex min-w-0 items-start gap-2">
					<div className="flex h-6 w-28 shrink-0 items-center text-xs text-muted-foreground">
						{formatTagGroupLabel(group.key)}
					</div>
					<div className={`flex min-w-0 flex-1 flex-wrap gap-1 ${privateBlurClassName}`}>
						{group.entries.map((entry) => {
							const isSelected = selectedTags.includes(entry.tag);

							return (
								<button
									key={entry.tag}
									type="button"
									title={entry.tag}
									onClick={() => onTagToggle(entry.tag)}
									disabled={isPending}
									className={`rounded border px-1.5 py-0.5 text-xs transition-colors disabled:pointer-events-none disabled:opacity-50 ${
										isSelected
											? `${getTagClassName(entry.tag)} border-foreground/30`
											: 'border-border/80 bg-background text-foreground/70 hover:border-foreground/40 hover:text-foreground'
									}`}
								>
									#{entry.value}
								</button>
							);
						})}
					</div>
				</div>
			))}
			{allTags.length === 0 ? <div className="text-xs text-muted-foreground">No system tags yet.</div> : null}
		</div>
	);
}
