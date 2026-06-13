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
			${Object.entries(themeVariables)
				.map(([k, v]) => `${k}: ${v};`)
				.join('\n\t\t\t')}
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
			margin: 0; padding: 0; width: 100%; height: 100%; overflow: auto; overscroll-behavior: contain;
		}
		#root { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; }
	`;
}

// srcdoc renderers still need inline scripts and babel eval, but this blocks app-origin data and network APIs.
const rendererCsp = [
	"default-src 'none'",
	"script-src 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.tailwindcss.com",
	"style-src 'unsafe-inline'",
	'img-src data: blob: https:',
	'font-src data: https:',
	"connect-src 'none'",
	"base-uri 'none'",
	"form-action 'none'",
].join('; ');

/**
 * Generate complete HTML document for iframe
 */
export function generateIframeHtml(code: string, themeVariables: ThemeVariables): string {
	//
	const safeCode = code.replace(/<\/script/gi, '<\\/script');

	return `
		<!DOCTYPE html>
		<html>
			<head>
				<meta charset="utf-8">
				<meta name="viewport" content="width=device-width, initial-scale=1">
				<meta http-equiv="Content-Security-Policy" content="${rendererCsp}">
				
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
					const rootElement = document.getElementById('root');
					const doubleTapDelayMs = 300;
					let lastTouchAt = 0;
					let lastTouchTarget = null;

					document.addEventListener(
						'touchend',
						(event) => {
							const now = Date.now();
							const hasDoubleTapped = now - lastTouchAt < doubleTapDelayMs;
							const hasSameTarget = event.target === lastTouchTarget;

							if (!hasDoubleTapped || !hasSameTarget) {
								lastTouchAt = now;
								lastTouchTarget = event.target;
								return;
							}

							lastTouchAt = 0;
							lastTouchTarget = null;
							event.preventDefault();
							event.stopPropagation();
							window.parent.postMessage({ type: 'meseeks:render-double-tap' }, '*');
						},
						{ capture: true, passive: false },
					);

					const escapeHtml = (value) =>
						String(value)
							.replace(/&/g, '&amp;')
							.replace(/</g, '&lt;')
							.replace(/>/g, '&gt;')
							.replace(/"/g, '&quot;')
							.replace(/'/g, '&#39;');

					const renderMessage = (message, color = '#666') => {
						if (!rootElement) return;
						rootElement.innerHTML =
							'<div style="color: ' +
							color +
							'; padding: 16px; text-align: center; font-family: sans-serif;">' +
							escapeHtml(message) +
							'</div>';
					};

					const renderError = (error) => {
						console.error('Error in AI-generated code:', error);

						if (error instanceof Error) {
							renderMessage('Error during render: ' + error.message, '#ef4444');
							return;
						}

						renderMessage('Error during render: ' + String(error), '#ef4444');
					};

					window.addEventListener('error', (event) => {
						renderError(event.error ?? event.message);
					});

					window.addEventListener('unhandledrejection', (event) => {
						renderError(event.reason);
					});

					try {
						if (typeof window.React === 'undefined' || typeof window.ReactDOM === 'undefined') {
							throw new Error('Renderer runtime failed to load.');
						}

						// Pre-transpiled AI-generated code
						${safeCode}
						
						// Check if Composition is available
						let ComponentToRender = null;
						
						if (typeof window.Composition !== 'undefined') {
							ComponentToRender = window.Composition;
						} else if (typeof Composition !== 'undefined') {
							ComponentToRender = Composition;
						}

						// Render the component if found
						if (!ComponentToRender) {
							renderMessage('Nothing to render.');
						} else if (!rootElement) {
							throw new Error('Renderer root was not found.');
						} else if (typeof ReactDOM.render === 'function') {
							ReactDOM.render(React.createElement(ComponentToRender), rootElement);
						} else if (typeof ReactDOM.createRoot === 'function') {
							const root = ReactDOM.createRoot(rootElement);
							root.render(React.createElement(ComponentToRender));
						} else {
							throw new Error('React renderer was not available.');
						}
					} catch (error) {
						renderError(error);
					}
				</script>
			</body>
		</html>
	`;
}

export function generateTsxIframeHtml(source: string, themeVariables: ThemeVariables): string {
	//
	const safeSource = normalizeRenderableTsxSource(source).replace(/<\/script/gi, '<\\/script');

	return `
		<!DOCTYPE html>
		<html>
			<head>
				<meta charset="utf-8">
				<meta name="viewport" content="width=device-width, initial-scale=1">
				<meta http-equiv="Content-Security-Policy" content="${rendererCsp}">

				<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
				<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
				<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
				<script src="https://cdn.tailwindcss.com"></script>

				<style>
					${generateThemeStyles(themeVariables)}
					#root { align-items: stretch; justify-content: flex-start; }
				</style>
			</head>
			<body>
				<div id="root">
					<div style="color: #666; padding: 16px; text-align: center; font-family: sans-serif;">
						Rendering...
					</div>
				</div>
				<script>
					const rootElement = document.getElementById('root');
					const escapeHtml = (value) =>
						String(value)
							.replace(/&/g, '&amp;')
							.replace(/</g, '&lt;')
							.replace(/>/g, '&gt;')
							.replace(/"/g, '&quot;')
							.replace(/'/g, '&#39;');

					const renderMessage = (message, color = '#666') => {
						if (!rootElement) return;
						rootElement.innerHTML =
							'<div style="color: ' +
							color +
							'; padding: 16px; text-align: center; font-family: sans-serif;">' +
							escapeHtml(message) +
							'</div>';
					};

					const renderError = (error) => {
						console.error('Error in TSX file render:', error);
						if (error instanceof Error) {
							renderMessage('Error during render: ' + error.message, '#ef4444');
							return;
						}
						renderMessage('Error during render: ' + String(error), '#ef4444');
					};

					window.addEventListener('error', (event) => {
						renderError(event.error ?? event.message);
					});

					window.addEventListener('unhandledrejection', (event) => {
						renderError(event.reason);
					});
				</script>
				<script type="text/babel" data-presets="typescript,react">
					try {
						if (typeof window.React === 'undefined' || typeof window.ReactDOM === 'undefined') {
							throw new Error('Renderer runtime failed to load.');
						}

						const React = window.React;
						const {
							Fragment,
							useEffect,
							useMemo,
							useRef,
							useState,
						} = React;

						${safeSource}

						const ComponentToRender =
							typeof Composition !== 'undefined'
								? Composition
								: typeof Page !== 'undefined'
									? Page
									: null;

						if (!ComponentToRender) {
							renderMessage('Nothing to render.');
						} else if (!rootElement) {
							throw new Error('Renderer root was not found.');
						} else if (typeof window.ReactDOM.createRoot === 'function') {
							const root = window.ReactDOM.createRoot(rootElement);
							root.render(React.createElement(ComponentToRender));
						} else if (typeof window.ReactDOM.render === 'function') {
							window.ReactDOM.render(React.createElement(ComponentToRender), rootElement);
						} else {
							throw new Error('React renderer was not available.');
						}
					} catch (error) {
						renderError(error);
					}
				</script>
			</body>
		</html>
	`;
}

function normalizeRenderableTsxSource(source: string) {
	//
	return source
		.replace(/^\s*import\s+[^;]+;\s*$/gm, '')
		.replace(/export\s+default\s+function\s+\w*\s*\(/, 'function Composition(')
		.replace(/export\s+default\s+function\s*\(/, 'function Composition(')
		.replace(/export\s+default\s+/, 'const Composition = ')
		.replace(/export\s+const\s+(\w+)\s*=/g, 'const $1 =')
		.replace(/export\s+function\s+(\w+)\s*\(/g, 'function $1(');
}
