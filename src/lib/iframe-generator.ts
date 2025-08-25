import type { ThemeVariables } from '~/hooks/useThemeVariables';

/**
 * Convert CSS variable to actual color value
 */
export function getColorValue(variable: keyof ThemeVariables, themeVariables: ThemeVariables): string {
	//
	const value = themeVariables[variable];
	// Convert HSL format to actual color
	if (value && value.includes(' ')) {
		return `hsl(${value})`;
	}
	return value || '#000000';
}

/**
 * Generate CSS styles for iframe with theme integration
 */
export function generateThemeStyles(themeVariables: ThemeVariables): string {
	//
	const get = (v: keyof ThemeVariables) => getColorValue(v, themeVariables);
	const raw = (v: keyof ThemeVariables) => themeVariables[v] ?? '';

	return `
		:root {
			${(Object.entries(themeVariables) as [string, string][]).map(([k, v]) => `${k}: ${v};`).join('\n\t\t\t')}
		}

		/* SVG text should use CSS color */
		svg text { fill: currentColor; }

		/* Backgrounds */
		.bg-background { background-color: ${get('--background')} !important; }
		.bg-foreground { background-color: ${get('--foreground')} !important; }
		.bg-primary { background-color: ${get('--primary')} !important; }
		.bg-secondary { background-color: ${get('--secondary')} !important; }
		.bg-accent { background-color: ${get('--accent')} !important; }
		.bg-muted { background-color: ${get('--muted')} !important; }
		.bg-card { background-color: ${get('--card')} !important; } /* FIX */

		/* Text (HTML) */
		.text-background { color: ${get('--background')} !important; }
		.text-foreground { color: ${get('--foreground')} !important; }
		.text-primary { color: ${get('--primary')} !important; }
		.text-primary-foreground { color: ${get('--primary-foreground')} !important; }
		.text-secondary-foreground { color: ${get('--secondary-foreground')} !important; }
		.text-accent-foreground { color: ${get('--accent-foreground')} !important; }
		.text-muted-foreground { color: ${get('--muted-foreground')} !important; }
		.text-card-foreground { color: ${get('--card-foreground')} !important; } /* FIX */

		/* SVG fills (needed for charts) */
		.fill-background { fill: ${get('--background')} !important; }
		.fill-foreground { fill: ${get('--foreground')} !important; }
		.fill-primary { fill: ${get('--primary')} !important; }
		.fill-secondary { fill: ${get('--secondary')} !important; }
		.fill-accent { fill: ${get('--accent')} !important; }
		.fill-muted { fill: ${get('--muted')} !important; }
		.fill-card { fill: ${get('--card')} !important; }
		.fill-primary-foreground { fill: ${get('--primary-foreground')} !important; }
		.fill-secondary-foreground { fill: ${get('--secondary-foreground')} !important; }
		.fill-accent-foreground { fill: ${get('--accent-foreground')} !important; }
		.fill-muted-foreground { fill: ${get('--muted-foreground')} !important; }
		.fill-card-foreground { fill: ${get('--card-foreground')} !important; }

		/* Optional: SVG strokes */
		.stroke-foreground { stroke: ${get('--foreground')} !important; }
		.stroke-muted-foreground { stroke: ${get('--muted-foreground')} !important; }
		.stroke-primary { stroke: ${get('--primary')} !important; }

		/* Borders / rings */
		.border-border { border-color: ${get('--border')} !important; }
		.border-input { border-color: ${get('--input')} !important; }
		.border-primary { border-color: ${get('--primary')} !important; }
		.ring-ring { --tw-ring-color: ${get('--ring')} !important; }

		/* Hovers (use HSL alpha syntax; no hex suffix on hsl(...)) */
		.hover\\:bg-primary\\/90:hover { background-color: hsl(${raw('--primary')} / 0.90) !important; }
		.hover\\:bg-secondary\\/80:hover { background-color: hsl(${raw('--secondary')} / 0.80) !important; }
		.hover\\:bg-accent\\/80:hover { background-color: hsl(${raw('--accent')} / 0.80) !important; }
		.hover\\:bg-accent:hover { background-color: ${get('--accent')} !important; }
		.hover\\:text-accent-foreground:hover { color: ${get('--accent-foreground')} !important; }
		.hover\\:text-foreground:hover { color: ${get('--foreground')} !important; }

		html, body {
			background: ${get('--background')};
			color: ${get('--foreground')};
			font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
			margin: 0; padding: 0; width: 100%; height: 100%; overflow: auto;
		}
		#root { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; }
	`;
}

/**
 * Generate complete HTML document for iframe
 */
export function generateIframeHtml(code: string, themeVariables: ThemeVariables): string {
	//
	return `
		<!DOCTYPE html>
		<html>
			<head>
				<meta charset="utf-8">
				<meta name="viewport" content="width=device-width, initial-scale=1">
				
				<!-- External dependencies -->
				<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
				<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
				<script src="https://cdn.tailwindcss.com"></script>
				
				<!-- Theme styles with actual color values -->
				<style>
					${generateThemeStyles(themeVariables)}
				</style>
			</head>
			<body>
				<div id="root">
					<div style="color: #666; padding: 16px; text-align: center; font-family: sans-serif;">
						Loading...
					</div>
				</div>
				<script>
					try {
						// Pre-transpiled AI-generated code
						${code}
						
						// Check if Composition is available
						let ComponentToRender = null;
						
						if (typeof window.Composition !== 'undefined') {
							ComponentToRender = window.Composition;
						} else if (typeof Composition !== 'undefined') {
							ComponentToRender = Composition;
						}

						// Render the component if found
						if (ComponentToRender) {
							ReactDOM.render(React.createElement(ComponentToRender), document.getElementById('root'));
						} else {
							// Show nothing to render message
							document.getElementById('root').innerHTML = 
								'<div style="color: #666; padding: 16px; text-align: center; font-family: sans-serif;">' +
								'Nothing to render.' +
								'</div>';
						}

					} catch (error) {
						console.error('Error in AI-generated code:', error);
						document.getElementById('root').innerHTML = 
							'<div style="color: red; padding: 1rem; font-family: sans-serif">' +
							'Error during render: ' + error
							'</div>';
					}
				</script>
			</body>
		</html>
	`;
}
