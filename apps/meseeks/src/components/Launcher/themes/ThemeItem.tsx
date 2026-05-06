import type { AppThemeId } from '~/lib/themes/catalog';
import { CommandItem } from '~/components/ui/command';
import type { AppTheme } from '../types';
import { ThemeIcon } from './ThemeIcon';

interface ThemeItemProps {
	iconName: string | undefined;
	isCurrent: boolean;
	onCommitTheme: (themeId: AppThemeId) => void | Promise<void>;
	onPreviewTheme: (themeId: AppThemeId) => void;
	theme: AppTheme;
}

export function ThemeItem({ iconName, isCurrent, onCommitTheme, onPreviewTheme, theme }: ThemeItemProps) {
	//
	return (
		<CommandItem
			value={`theme:${theme.id}`}
			keywords={[
				'theme',
				theme.id,
				theme.name,
				theme.description,
				theme.mode,
				`${theme.mode} theme`,
				`${theme.mode} mode`,
			]}
			onMouseEnter={() => onPreviewTheme(theme.id)}
			onSelect={() => onCommitTheme(theme.id)}
		>
			<ThemeIcon iconName={iconName} />
			{theme.name}
			{isCurrent ? ' (Current)' : ''}
		</CommandItem>
	);
}
