import { RotateCcw } from 'lucide-react';
import type { AppThemeId } from '~/lib/themes/catalog';
import { CommandItem } from '@reactor/ui/command';

interface ResetThemeItemProps {
	isCurrent: boolean;
	onPreviewTheme: (themeId: AppThemeId) => void;
	onResetTheme: () => void | Promise<void>;
	systemThemeId: AppThemeId;
}

export function ResetThemeItem({ isCurrent, onPreviewTheme, onResetTheme, systemThemeId }: ResetThemeItemProps) {
	//
	return (
		<CommandItem
			forceMount
			value="theme:reset"
			keywords={['theme', 'reset', 'default', 'system', 'dark', 'light', 'mode', 'appearance']}
			onMouseEnter={() => onPreviewTheme(systemThemeId)}
			onSelect={onResetTheme}
		>
			<RotateCcw className="mr-2" />
			Reset to default dark/light based on system
			{isCurrent ? ' (Current)' : ''}
		</CommandItem>
	);
}
