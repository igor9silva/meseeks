import { useEffect, useMemo, useState } from 'react';

export interface ThemeVariables {
	'--background': string;
	'--foreground': string;
	'--primary': string;
	'--primary-foreground': string;
	'--secondary': string;
	'--secondary-foreground': string;
	'--accent': string;
	'--accent-foreground': string;
	'--muted': string;
	'--muted-foreground': string;
	'--border': string;
	'--input': string;
	'--ring': string;
	'--radius': string;
	'--card': string;
	'--card-foreground': string;
}

/**
 * Hook to extract theme variables from the document and watch for theme changes
 */
export function useThemeVariables() {
	//
	const [themeUpdateKey, setThemeUpdateKey] = useState(0);

	// Watch for theme changes (dark/light mode switches)
	useEffect(() => {
		const observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				if (
					mutation.type === 'attributes' &&
					(mutation.attributeName === 'class' || mutation.attributeName === 'data-theme') &&
					mutation.target === document.documentElement
				) {
					// Theme changed, force recalculation
					setThemeUpdateKey((prev) => prev + 1);
				}
			});
		});

		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class', 'data-theme'],
		});

		return () => observer.disconnect();
	}, []);

	// Extract current theme variables
	const themeVariables = useMemo((): ThemeVariables => {
		//
		void themeUpdateKey; // force recompute when theme changes

		const root = document.documentElement;
		const computed = getComputedStyle(root);

		return {
			'--background': computed.getPropertyValue('--background'),
			'--foreground': computed.getPropertyValue('--foreground'),
			'--primary': computed.getPropertyValue('--primary'),
			'--primary-foreground': computed.getPropertyValue('--primary-foreground'),
			'--secondary': computed.getPropertyValue('--secondary'),
			'--secondary-foreground': computed.getPropertyValue('--secondary-foreground'),
			'--accent': computed.getPropertyValue('--accent'),
			'--accent-foreground': computed.getPropertyValue('--accent-foreground'),
			'--muted': computed.getPropertyValue('--muted'),
			'--muted-foreground': computed.getPropertyValue('--muted-foreground'),
			'--border': computed.getPropertyValue('--border'),
			'--input': computed.getPropertyValue('--input'),
			'--ring': computed.getPropertyValue('--ring'),
			'--radius': computed.getPropertyValue('--radius'),
			'--card': computed.getPropertyValue('--card'),
			'--card-foreground': computed.getPropertyValue('--card-foreground'),
		};
	}, [themeUpdateKey]);

	return { themeVariables, themeUpdateKey };
}
