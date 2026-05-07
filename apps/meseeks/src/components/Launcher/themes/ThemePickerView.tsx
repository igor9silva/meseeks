import { useCommandState } from 'cmdk';
import { useEffect, useMemo } from 'react';
import { CommandGroup, CommandSeparator } from '@reactor/ui/command';
import { APP_THEMES, type AppThemeId } from '~/lib/themes/catalog';
import { isThemeId } from '~/lib/themes/resolve';
import { matchesThemeSearch } from '../themeSearch';
import { BackToLauncherItem } from './BackToLauncherItem';
import { ResetThemeItem } from './ResetThemeItem';
import { ThemeItem } from './ThemeItem';

interface ThemePickerViewProps {
	hasCustomTheme: boolean;
	persistedThemeId: AppThemeId | null;
	onBack: () => void;
	onClearPreview: () => void;
	onPreviewTheme: (themeId: AppThemeId) => void;
	onCommitTheme: (themeId: AppThemeId) => void | Promise<void>;
	onResetTheme: () => void | Promise<void>;
	systemThemeId: AppThemeId;
	themeIconNameById: Record<string, string>;
	themeSearch: string;
}

export function ThemePickerView({
	hasCustomTheme,
	persistedThemeId,
	onBack,
	onClearPreview,
	onPreviewTheme,
	onCommitTheme,
	onResetTheme,
	systemThemeId,
	themeIconNameById,
	themeSearch,
}: ThemePickerViewProps) {
	//
	const selectedValue = useCommandState((state) => state.value);
	const visibleThemes = useMemo(() => {
		return APP_THEMES.filter((theme) => matchesThemeSearch(theme, themeSearch));
	}, [themeSearch]);

	useEffect(() => {
		if (selectedValue === 'theme:back') {
			onClearPreview();
			return;
		}

		if (selectedValue === 'theme:reset') {
			onPreviewTheme(systemThemeId);
			return;
		}

		if (!selectedValue.startsWith('theme:')) return;

		const hoveredThemeId = selectedValue.replace('theme:', '');
		if (!isThemeId(hoveredThemeId)) return;

		onPreviewTheme(hoveredThemeId);
	}, [onClearPreview, onPreviewTheme, selectedValue, systemThemeId]);

	return (
		<>
			<CommandGroup heading="Themes" forceMount>
				{visibleThemes.map((theme) => (
					<ThemeItem
						key={theme.id}
						iconName={themeIconNameById[theme.id]}
						isCurrent={theme.id === persistedThemeId}
						onCommitTheme={onCommitTheme}
						onPreviewTheme={onPreviewTheme}
						theme={theme}
					/>
				))}
			</CommandGroup>
			<CommandSeparator alwaysRender className="my-2" />
			<CommandGroup forceMount value="theme-actions">
				<ResetThemeItem
					isCurrent={!hasCustomTheme}
					onPreviewTheme={onPreviewTheme}
					onResetTheme={onResetTheme}
					systemThemeId={systemThemeId}
				/>
				<BackToLauncherItem onBack={onBack} onClearPreview={onClearPreview} />
			</CommandGroup>
		</>
	);
}
