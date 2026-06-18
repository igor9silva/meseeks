import { memo } from 'react';
import { QuickActionsSection } from './quickActions/Section';
import { ShortcutsSection } from './shortcuts/Section';

interface LauncherContentProps {
	onClose: () => void;
	onFeedback: () => void;
	onNavigate: (value: string) => void;
	onOpenThemePicker: () => void;
}

export const LauncherContent = memo(function LauncherContent({
	onClose,
	onFeedback,
	onNavigate,
	onOpenThemePicker,
}: LauncherContentProps) {
	//
	return (
		<>
			<QuickActionsSection onFeedback={onFeedback} onOpenThemePicker={onOpenThemePicker} />
			<ShortcutsSection onClose={onClose} onNavigate={onNavigate} />
		</>
	);
});
