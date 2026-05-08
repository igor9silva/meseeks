import { Palette } from 'lucide-react';
import { CommandItem } from '@reactor/ui/command';

export function ThemePickerItem({ onSelect }: { onSelect: () => void }) {
	//
	return (
		<CommandItem
			value="set-theme"
			keywords={[
				'theme',
				'appearance',
				'dark',
				'light',
				'dark mode',
				'light mode',
				'mode',
				'color',
				'colors',
				'palette',
				'system',
			]}
			onSelect={onSelect}
		>
			<Palette className="mr-2" />
			Set theme
		</CommandItem>
	);
}
