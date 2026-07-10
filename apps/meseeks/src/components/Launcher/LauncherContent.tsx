import { memo } from 'react';
import type { Id } from 'convex/_generated/dataModel';
import { QuickActionsSection } from './quickActions/Section';
import { ShortcutsSection } from './shortcuts/Section';
import { FilesSection } from './files/Section';
import type { LauncherFile } from './types';

interface LauncherContentProps {
	currentFileId: Id<'files'> | undefined;
	isLoadingMore: boolean;
	onClose: () => void;
	onFeedback: () => void;
	onNavigate: (value: string) => void;
	onOpenThemePicker: () => void;
	shouldUseSearch: boolean;
	files: LauncherFile[];
}

export const LauncherContent = memo(function LauncherContent({
	currentFileId,
	isLoadingMore,
	onClose,
	onFeedback,
	onNavigate,
	onOpenThemePicker,
	shouldUseSearch,
	files,
}: LauncherContentProps) {
	//
	return (
		<>
			<QuickActionsSection
				currentFileId={currentFileId}
				onFeedback={onFeedback}
				onOpenThemePicker={onOpenThemePicker}
			/>
			<ShortcutsSection onClose={onClose} onNavigate={onNavigate} shouldUseSearch={shouldUseSearch} />
			<FilesSection isLoadingMore={isLoadingMore} onNavigate={onNavigate} files={files} />
		</>
	);
});
