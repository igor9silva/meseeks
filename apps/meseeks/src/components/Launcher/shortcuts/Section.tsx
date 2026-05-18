import { Suspense } from 'react';
import { CommandGroup } from '@reactor/ui/command';
import { DevModeItem } from './DevModeItem';
import { InboxItem } from './InboxItem';
import { NewTaskItem } from './NewTaskItem';
import { SchedulesItem } from './SchedulesItem';
import { SeekItem } from './SeekItem';
import { SignOutItem } from './SignOutItem';
import { SkillsItem } from './SkillsItem';
import { SourceCodeItem } from './SourceCodeItem';
import { SubscribeItem } from './SubscribeItem';
import { WalletItem } from './WalletItem';

interface ShortcutsSectionProps {
	onClose: () => void;
	onNavigate: (value: string) => void;
	shouldUseSearch: boolean;
}

export function ShortcutsSection({ onClose, onNavigate, shouldUseSearch }: ShortcutsSectionProps) {
	//
	return (
		<CommandGroup heading="Shortcuts">
			<InboxItem onSelect={onNavigate} />
			<NewTaskItem onSelect={onNavigate} />
			<SeekItem shouldUseSearch={shouldUseSearch} />
			<WalletItem onSelect={onNavigate} />
			<Suspense fallback={null}>
				<SubscribeItem onSelect={onNavigate} />
			</Suspense>
			<SkillsItem onSelect={onNavigate} />
			<SchedulesItem onSelect={onNavigate} />
			<DevModeItem />
			<SourceCodeItem onClose={onClose} />
			<SignOutItem />
		</CommandGroup>
	);
}
