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
	const getColor = (variable: keyof ThemeVariables) => getColorValue(variable, themeVariables);

	return `
		:root {
			${(Object.entries(themeVariables) as [string, string][]).map(([key, value]) => `${key}: ${value};`).join('\n			')}
		}
		
		/* Custom theme classes that work with Tailwind CDN */
		.bg-background { background-color: ${getColor('--background')} !important; }
		.bg-foreground { background-color: ${getColor('--foreground')} !important; }
		.bg-primary { background-color: ${getColor('--primary')} !important; }
		.bg-secondary { background-color: ${getColor('--secondary')} !important; }
		.bg-accent { background-color: ${getColor('--accent')} !important; }
		.bg-muted { background-color: ${getColor('--muted')} !important; }
		.bg-card { background-color: ${getColor('--background')} !important; }
		
		.text-background { color: ${getColor('--background')} !important; }
		.text-foreground { color: ${getColor('--foreground')} !important; }
		.text-primary { color: ${getColor('--primary')} !important; }
		.text-primary-foreground { color: ${getColor('--primary-foreground')} !important; }
		.text-secondary-foreground { color: ${getColor('--secondary-foreground')} !important; }
		.text-accent-foreground { color: ${getColor('--accent-foreground')} !important; }
		.text-muted-foreground { color: ${getColor('--muted-foreground')} !important; }
		.text-card-foreground { color: ${getColor('--foreground')} !important; }
		
		.border-border { border-color: ${getColor('--border')} !important; }
		.border-input { border-color: ${getColor('--input')} !important; }
		.border-primary { border-color: ${getColor('--primary')} !important; }
		
		.ring-ring { --tw-ring-color: ${getColor('--ring')} !important; }
		
		/* Hover states */
		.hover\\:bg-primary\\/90:hover { background-color: ${getColor('--primary')}e6 !important; }
		.hover\\:bg-secondary\\/80:hover { background-color: ${getColor('--secondary')}cc !important; }
		.hover\\:bg-accent\\/80:hover { background-color: ${getColor('--accent')}cc !important; }
		.hover\\:bg-accent:hover { background-color: ${getColor('--accent')} !important; }
		.hover\\:text-accent-foreground:hover { color: ${getColor('--accent-foreground')} !important; }
		.hover\\:text-foreground:hover { color: ${getColor('--foreground')} !important; }
		
		* { border-color: ${getColor('--border')}; }
		html, body { 
			background: ${getColor('--background')};
			color: ${getColor('--foreground')};
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
			margin: 0;
			padding: 0;
			width: 100%;
			height: 100%;
			overflow: auto;
		}
		
		#root {
			width: 100%;
			height: 100%;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
		}
		
		/* Focus states */
		.focus\\:ring-2:focus {
			--tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);
			--tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color);
			box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);
			--tw-ring-color: ${getColor('--ring')};
		}
		.focus\\:border-transparent:focus { border-color: transparent !important; }
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
