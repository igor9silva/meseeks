import { getTagGroupLookupKey } from '~/lib/taskTags';
import { TagFilterGroup } from './TagFilterGroup';
import type { TaskBoardHeaderActions, TaskBoardHeaderState } from './TaskBoardHeaderTypes';

export function TagFilterPanel({ state, actions }: { state: TaskBoardHeaderState; actions: TaskBoardHeaderActions }) {
	//
	if (state.tagGroups.length === 0) return null;

	return (
		<div className="border-t border-border/80">
			<div
				style={{ height: state.tagFilterHeight }}
				className="min-h-12 max-h-80 space-y-2 overflow-auto px-3 py-2"
			>
				{state.tagGroups.map((group) => (
					<TagFilterGroup
						key={getTagGroupLookupKey(group.key)}
						group={group}
						includedTags={state.queryInput.tags}
						excludedTags={state.queryInput.excludedTags}
						onTagFilterCycle={actions.onTagFilterCycle}
					/>
				))}
			</div>
			<button
				type="button"
				role="separator"
				aria-label="Resize tag filters"
				aria-orientation="horizontal"
				aria-valuemin={42}
				aria-valuemax={320}
				aria-valuenow={Math.round(state.tagFilterHeight)}
				data-dragging={state.isTagFilterDragging}
				onPointerDown={actions.onTagFilterResizeStart}
				onPointerMove={actions.onTagFilterResizeMove}
				onPointerUp={actions.onTagFilterResizeEnd}
				onPointerCancel={actions.onTagFilterResizeEnd}
				className="relative flex h-px w-full cursor-row-resize touch-none items-center justify-center bg-border before:absolute before:left-0 before:top-1/2 before:h-8 before:w-full before:-translate-y-1/2 after:absolute after:left-0 after:top-1/2 after:h-1.5 after:w-full after:-translate-y-1/2 after:transition-colors hover:after:bg-ring/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 data-[dragging=true]:after:bg-ring/20"
			/>
		</div>
	);
}
