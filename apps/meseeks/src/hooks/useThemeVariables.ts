import { useMemo } from 'react';

import { z } from 'zod/v3';
import { useTheme } from '~/components/ThemeProvider';
import { BASE_THEME_VARIABLES, themeVariablesSchema } from '~/lib/themes/catalog';
import { getRequiredTheme } from '~/lib/themes/resolve';

const renderThemeVariablesSchema = themeVariablesSchema.extend({
	'--radius': z.string(),
});

export type ThemeVariables = z.infer<typeof renderThemeVariablesSchema>;

/**
 * hook to provide active theme variables for iframe renders
 */
export function useThemeVariables() {
	//
	const { themeId } = useTheme();

	const themeVariables = useMemo(() => {
		const theme = getRequiredTheme(themeId);
		return renderThemeVariablesSchema.parse({
			...BASE_THEME_VARIABLES,
			...theme.variables,
		});
	}, [themeId]);

	return { themeVariables, themeUpdateKey: themeId };
}
