import { memo } from 'react';
import type { Id } from 'convex/_generated/dataModel';
import { QuickActionsSection } from './quickActions/Section';
import { ShortcutsSection } from './shortcuts/Section';
import { TasksSection } from './tasks/Section';
import type { LauncherTask } from './types';

interface LauncherContentProps {
	currentTaskId: Id<'tasks'> | undefined;
	isLoadingMore: boolean;
	onClose: () => void;
	onFeedback: () => void;
	onNavigate: (value: string) => void;
	onOpenThemePicker: () => void;
	shouldUseSearch: boolean;
	tasks: LauncherTask[];
}

export const LauncherContent = memo(function LauncherContent({
	currentTaskId,
	isLoadingMore,
	onClose,
	onFeedback,
	onNavigate,
	onOpenThemePicker,
	shouldUseSearch,
	tasks,
}: LauncherContentProps) {
	//
	return (
		<>
			<QuickActionsSection
				currentTaskId={currentTaskId}
				onFeedback={onFeedback}
				onOpenThemePicker={onOpenThemePicker}
			/>
			<ShortcutsSection onClose={onClose} onNavigate={onNavigate} shouldUseSearch={shouldUseSearch} />
			<TasksSection isLoadingMore={isLoadingMore} onNavigate={onNavigate} tasks={tasks} />
		</>
	);
});
