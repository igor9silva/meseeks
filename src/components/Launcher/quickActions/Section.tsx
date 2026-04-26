import type { Id } from 'convex/_generated/dataModel';
import { CommandGroup } from '~/components/ui/command';
import { CurrentTaskActions } from '../currentTask/Actions';
import { FeedbackItem } from './FeedbackItem';
import { RefreshItem } from './RefreshItem';
import { ThemePickerItem } from './ThemePickerItem';

interface QuickActionsSectionProps {
	currentTaskId: Id<'tasks'> | undefined;
	onFeedback: () => void;
	onOpenThemePicker: () => void;
}

export function QuickActionsSection({ currentTaskId, onFeedback, onOpenThemePicker }: QuickActionsSectionProps) {
	//
	return (
		<CommandGroup heading="Quick actions">
			<CurrentTaskActions taskId={currentTaskId} />
			<FeedbackItem onSelect={onFeedback} />
			<RefreshItem />
			<ThemePickerItem onSelect={onOpenThemePicker} />
		</CommandGroup>
	);
}
