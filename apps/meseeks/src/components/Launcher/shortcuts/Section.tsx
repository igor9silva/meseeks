import { CommandGroup } from '@reactor/ui/command';
import { BalanceItem } from './BalanceItem';
import { DevModeItem } from './DevModeItem';
import { InboxItem } from './InboxItem';
import { SignOutItem } from './SignOutItem';
import { SkillsItem } from './SkillsItem';
import { SourceCodeItem } from './SourceCodeItem';

interface ShortcutsSectionProps {
	onClose: () => void;
	onNavigate: (value: string) => void;
}

export function ShortcutsSection({ onClose, onNavigate }: ShortcutsSectionProps) {
	//
	return (
		<CommandGroup heading="Shortcuts">
			<InboxItem onSelect={onNavigate} />
			<BalanceItem onSelect={onNavigate} />
			<SkillsItem onSelect={onNavigate} />
			<DevModeItem />
			<SourceCodeItem onClose={onClose} />
			<SignOutItem />
		</CommandGroup>
	);
}
