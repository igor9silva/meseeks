const escapeHtml = (value: string): string =>
	value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");

export const loadingScreenHtml = (title: string, detail: string): string => `
<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>${escapeHtml(title)}</title>
	<style>
		:root {
			color-scheme: light dark;
			--bg: #111318;
			--panel: rgba(255, 255, 255, 0.08);
			--text: #f7f9fc;
			--muted: rgba(247, 249, 252, 0.7);
			--accent: #6ee7b7;
			font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
		}

		body {
			margin: 0;
			min-height: 100vh;
			display: grid;
			place-items: center;
			background:
				radial-gradient(circle at top left, rgba(110, 231, 183, 0.18), transparent 30%),
				radial-gradient(circle at bottom right, rgba(56, 189, 248, 0.15), transparent 35%),
				linear-gradient(160deg, #0b0e13, #161b24 60%, #0f141d);
			color: var(--text);
		}

		.card {
			width: min(520px, calc(100vw - 64px));
			padding: 28px 30px;
			border-radius: 18px;
			background: var(--panel);
			backdrop-filter: blur(18px);
			box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
		}

		h1 {
			margin: 0 0 8px;
			font-size: 28px;
			font-weight: 650;
			letter-spacing: -0.02em;
		}

		p {
			margin: 0;
			color: var(--muted);
			line-height: 1.5;
		}

		.status {
			display: flex;
			align-items: center;
			gap: 14px;
			margin-top: 24px;
		}

		.spinner {
			width: 18px;
			height: 18px;
			border-radius: 999px;
			border: 2px solid rgba(255, 255, 255, 0.2);
			border-top-color: var(--accent);
			animation: spin 0.9s linear infinite;
		}

		.meta {
			margin-top: 18px;
			font-size: 12px;
			color: rgba(247, 249, 252, 0.5);
		}

		@keyframes spin {
			to {
				transform: rotate(360deg);
			}
		}
	</style>
</head>
<body>
	<section class="card">
		<h1>${escapeHtml(title)}</h1>
		<p>${escapeHtml(detail)}</p>
		<div class="status">
			<div class="spinner"></div>
			<p>Starting the local backend and waiting for the workbench to become healthy.</p>
		</div>
		<p class="meta">Renderer: Electrobun native webview. Backend: code-server on localhost.</p>
	</section>
</body>
</html>
`;

export const errorScreenHtml = (
	title: string,
	summary: string,
	detail: string,
	logPath: string,
): string => `
<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>${escapeHtml(title)}</title>
	<style>
		:root {
			font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
			color-scheme: dark;
			--bg: #120f14;
			--panel: #1b161d;
			--border: rgba(255, 255, 255, 0.1);
			--text: #f6f2ff;
			--muted: rgba(246, 242, 255, 0.7);
			--accent: #fb7185;
		}

		body {
			margin: 0;
			padding: 32px;
			background:
				radial-gradient(circle at top right, rgba(251, 113, 133, 0.16), transparent 25%),
				radial-gradient(circle at bottom left, rgba(244, 114, 182, 0.1), transparent 30%),
				var(--bg);
			color: var(--text);
		}

		.card {
			max-width: 920px;
			margin: 0 auto;
			padding: 24px;
			border-radius: 18px;
			background: var(--panel);
			border: 1px solid var(--border);
		}

		h1 {
			margin: 0 0 12px;
			font-size: 24px;
		}

		p {
			margin: 0 0 12px;
			color: var(--muted);
			line-height: 1.6;
		}

		pre {
			overflow: auto;
			padding: 16px;
			border-radius: 12px;
			background: rgba(0, 0, 0, 0.25);
			border: 1px solid rgba(255, 255, 255, 0.08);
			color: #fef2f2;
			line-height: 1.45;
			white-space: pre-wrap;
			word-break: break-word;
		}

		.note {
			margin-top: 16px;
			padding: 14px 16px;
			border-left: 3px solid var(--accent);
			background: rgba(251, 113, 133, 0.08);
		}
	</style>
</head>
<body>
	<section class="card">
		<h1>${escapeHtml(title)}</h1>
		<p>${escapeHtml(summary)}</p>
		<div class="note">
			<p>Shell log: ${escapeHtml(logPath)}</p>
		</div>
		<pre>${escapeHtml(detail)}</pre>
	</section>
</body>
</html>
`;
