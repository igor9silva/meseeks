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

const DEFAULT_THEME_VARIABLES: ThemeVariables = {
	'--background': '0 0% 100%',
	'--foreground': '240 10% 3.9%',
	'--primary': '240 5.9% 10%',
	'--primary-foreground': '0 0% 98%',
	'--secondary': '240 4.8% 95.9%',
	'--secondary-foreground': '240 5.9% 10%',
	'--accent': '240 4.8% 95.9%',
	'--accent-foreground': '240 5.9% 10%',
	'--muted': '240 4.8% 95.9%',
	'--muted-foreground': '240 3.8% 46.1%',
	'--border': '240 5.9% 90%',
	'--input': '240 5.9% 90%',
	'--ring': '240 5.9% 10%',
	'--radius': '0.5rem',
	'--card': '0 0% 100%',
	'--card-foreground': '240 10% 3.9%',
};

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
					mutation.attributeName === 'class' &&
					mutation.target === document.documentElement
				) {
					// Theme changed, force recalculation
					setThemeUpdateKey((prev) => prev + 1);
				}
			});
		});

		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class'],
		});

		return () => observer.disconnect();
	}, []);

	// Extract current theme variables
	const themeVariables = useMemo((): ThemeVariables => {
		//
		void themeUpdateKey; // force recompute when theme changes

		if (typeof document === 'undefined') return DEFAULT_THEME_VARIABLES;

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
