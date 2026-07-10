import type { Id } from 'convex/_generated/dataModel';
import { CommandGroup } from '@reactor/ui/command';
import { CurrentFileActions } from '../currentFile/Actions';
import { FeedbackItem } from './FeedbackItem';
import { RefreshItem } from './RefreshItem';
import { ThemePickerItem } from './ThemePickerItem';

interface QuickActionsSectionProps {
	currentFileId: Id<'files'> | undefined;
	onFeedback: () => void;
	onOpenThemePicker: () => void;
}

export function QuickActionsSection({ currentFileId, onFeedback, onOpenThemePicker }: QuickActionsSectionProps) {
	//
	return (
		<CommandGroup heading="Quick actions">
			<CurrentFileActions fileId={currentFileId} />
			<FeedbackItem onSelect={onFeedback} />
			<RefreshItem />
			<ThemePickerItem onSelect={onOpenThemePicker} />
		</CommandGroup>
	);
}
