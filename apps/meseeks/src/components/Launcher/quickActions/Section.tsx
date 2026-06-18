import { CommandGroup } from '@reactor/ui/command';
import { FeedbackItem } from './FeedbackItem';
import { RefreshItem } from './RefreshItem';
import { ThemePickerItem } from './ThemePickerItem';

interface QuickActionsSectionProps {
	onFeedback: () => void;
	onOpenThemePicker: () => void;
}

export function QuickActionsSection({ onFeedback, onOpenThemePicker }: QuickActionsSectionProps) {
	//
	return (
		<CommandGroup heading="Quick actions">
			<FeedbackItem onSelect={onFeedback} />
			<RefreshItem />
			<ThemePickerItem onSelect={onOpenThemePicker} />
		</CommandGroup>
	);
}
