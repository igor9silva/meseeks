import { Input } from '@pro/ui';
import { Search } from 'lucide-react';
import { type ExplorerSort, explorerSortSchema } from '~/lib/explorerSearchParams';
import { DepthRangeControl } from './DepthRangeControl';
import type { TaskBoardHeaderActions, TaskBoardHeaderState } from './TaskBoardHeaderTypes';
import { ViewTabs } from './ViewTabs';

export function TaskBoardToolbar({ state, actions }: { state: TaskBoardHeaderState; actions: TaskBoardHeaderActions }) {
	//
	return (
		<div className="flex flex-wrap items-center gap-2 border-t border-border/80 px-3 py-3">
			<div className="relative min-w-80 flex-1">
				<label className="sr-only" htmlFor={state.searchInputId}>
					Search tasks
				</label>
				<Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					id={state.searchInputId}
					value={state.searchDraft}
					onChange={(event) => actions.onSearchDraftChange(event.currentTarget.value)}
					placeholder="Search title, path, tags, body"
					className="h-9 rounded-md pl-8"
				/>
			</div>
			<div className="flex shrink-0 flex-wrap items-center gap-1">
				{state.shouldShowViewTabs ? (
					<ViewTabs currentView={state.config.view} onViewChange={actions.onViewChange} />
				) : null}
				<DepthRangeControl
					minDepth={state.queryInput.minDepth}
					maxDepth={state.queryInput.maxDepth}
					onDepthRangeChange={actions.onDepthRangeChange}
				/>
				<SortSelect value={state.queryInput.sort} onSortChange={actions.onSortChange} />
			</div>
		</div>
	);
}

function SortSelect({ value, onSortChange }: { value: ExplorerSort; onSortChange: (sort: ExplorerSort) => void }) {
	//
	return (
		<select
			value={value}
			onChange={(event) => {
				const parsedSort = explorerSortSchema.safeParse(event.currentTarget.value);
				if (!parsedSort.success) return;
				onSortChange(parsedSort.data);
			}}
			className="h-8 rounded-md border border-input bg-background px-2 text-xs"
		>
			<option value="priority_then_recency">Priority</option>
			<option value="recency">Recent</option>
			<option value="title">Title</option>
		</select>
	);
}
