import { useEffect, useId, useState } from 'react';

let hasInitializedMermaid = false;

export function MermaidBlock({ source }: { source: string }) {
	//
	const blockId = useId();
	const [renderResult, setRenderResult] = useState<{
		source: string;
		svg: string | null;
		error: string | null;
	}>({ source, svg: null, error: null });
	const isCurrentRender = renderResult.source === source;
	const svg = isCurrentRender ? renderResult.svg : null;
	const error = isCurrentRender ? renderResult.error : null;

	useEffect(() => {
		let isActive = true;
		const diagramId = toMermaidDomId(blockId);

		void renderMermaidSvg(diagramId, source)
			.then((nextSvg) => {
				if (!isActive) return;
				setRenderResult({ source, svg: nextSvg, error: null });
			})
			.catch((renderError: unknown) => {
				if (!isActive) return;

				const message = renderError instanceof Error ? renderError.message : 'unknown render error';
				setRenderResult({ source, svg: null, error: message });
			});

		return () => {
			isActive = false;
		};
	}, [blockId, source]);

	if (error) {
		return (
			<div className="space-y-2">
				<div className="text-sm text-destructive">Could not render Mermaid diagram. Showing source.</div>
				<pre className="bg-muted text-foreground rounded-md p-3 overflow-x-auto text-sm border border-border">
					{source}
				</pre>
			</div>
		);
	}

	if (!svg) {
		return <div className="text-sm text-muted-foreground">Rendering Mermaid diagram…</div>;
	}

	return (
		<div className="rounded-md border border-border bg-background p-3 overflow-x-auto max-h-[50rem]">
			<img alt="Mermaid diagram" className="max-w-none" src={toSvgDataUrl(svg)} />
		</div>
	);
}

async function renderMermaidSvg(diagramId: string, source: string): Promise<string> {
	//
	const mermaidModule = await import('mermaid');
	const mermaid = mermaidModule.default;

	if (!hasInitializedMermaid) {
		mermaid.initialize({
			startOnLoad: false,
			securityLevel: 'loose',
			theme: 'dark',
		});
		hasInitializedMermaid = true;
	}

	const result = await mermaid.render(diagramId, source);
	return result.svg;
}

function toMermaidDomId(rawId: string): string {
	//
	const sanitized = rawId.replace(/[^a-zA-Z0-9_-]/g, '');
	if (sanitized.length > 0) return `mermaid-${sanitized}`;
	return 'mermaid-diagram';
}

function toSvgDataUrl(svg: string): string {
	//
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
