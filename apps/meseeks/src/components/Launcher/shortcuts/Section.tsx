import { CommandGroup } from '@reactor/ui/command';
import { BalanceItem } from './BalanceItem';
import { DevModeItem } from './DevModeItem';
import { InboxItem } from './InboxItem';
import { NewFileItem } from './NewFileItem';
import { SeekItem } from './SeekItem';
import { SignOutItem } from './SignOutItem';
import { SkillsItem } from './SkillsItem';
import { SourceCodeItem } from './SourceCodeItem';

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
			<NewFileItem onSelect={onNavigate} />
			<SeekItem shouldUseSearch={shouldUseSearch} />
			<BalanceItem onSelect={onNavigate} />
			<SkillsItem onSelect={onNavigate} />
			<DevModeItem />
			<SourceCodeItem onClose={onClose} />
			<SignOutItem />
		</CommandGroup>
	);
}
