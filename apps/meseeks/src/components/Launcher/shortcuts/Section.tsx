import { CommandGroup } from '@reactor/ui/command';
import { SignOutItem } from './SignOutItem';
import { SkillsItem } from './SkillsItem';
import { SourceCodeItem } from './SourceCodeItem';
import { WalletItem } from './WalletItem';

interface ShortcutsSectionProps {
	onClose: () => void;
	onNavigate: (value: string) => void;
}

export function ShortcutsSection({ onClose, onNavigate }: ShortcutsSectionProps) {
	//
	return (
		<CommandGroup heading="Shortcuts">
			<WalletItem onSelect={onNavigate} />
			<SkillsItem onSelect={onNavigate} />
			<SourceCodeItem onClose={onClose} />
			<SignOutItem />
		</CommandGroup>
	);
}
