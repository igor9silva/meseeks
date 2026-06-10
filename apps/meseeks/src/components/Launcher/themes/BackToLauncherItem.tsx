import { ArrowLeft } from 'lucide-react';
import { CommandItem } from '@pro/ui/command';

interface BackToLauncherItemProps {
	onBack: () => void;
	onClearPreview: () => void;
}

export function BackToLauncherItem({ onBack, onClearPreview }: BackToLauncherItemProps) {
	//
	return (
		<CommandItem forceMount value="theme:back" keywords={['back']} onMouseEnter={onClearPreview} onSelect={onBack}>
			<ArrowLeft className="mr-2" />
			Back to launcher
		</CommandItem>
	);
}
