import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import MDX from '~/components/ui/mdx';
import appCss from '~/styles/app.css?url';

interface MdxFileRendererProps {
	//
	content: string;
	shouldRenderComponents: boolean;
}

const srcDoc = `<!DOCTYPE html>
<html>
	<head>
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<link rel="stylesheet" href="${appCss}">
		<style>
			html, body, #root {
				min-height: 100%;
				margin: 0;
			}

			body {
				background: hsl(var(--background));
				color: hsl(var(--foreground));
			}

			#root {
				padding: 1rem;
			}
		</style>
	</head>
	<body>
		<div id="root"></div>
	</body>
</html>`;

export function MdxFileRenderer({ content, shouldRenderComponents }: MdxFileRendererProps) {
	//
	const iframeRef = useRef<HTMLIFrameElement>(null);
	const [mount, setMount] = useState<HTMLElement | null>(null);

	useEffect(() => {
		const iframe = iframeRef.current;
		if (!iframe) return;
		const root = iframe.contentDocument?.getElementById('root');
		setMount(root ?? null);
	}, []);

	const handleLoad = () => {
		const root = iframeRef.current?.contentDocument?.getElementById('root');
		setMount(root ?? null);
	};

	return (
		<>
			<iframe
				ref={iframeRef}
				srcDoc={srcDoc}
				title="Rendered MDX"
				className="block h-full min-h-full w-full border-none bg-background"
				referrerPolicy="no-referrer"
				onLoad={handleLoad}
			/>
			{mount ? createPortal(<MDX text={content} shouldRenderComponents={shouldRenderComponents} />, mount) : null}
		</>
	);
}
