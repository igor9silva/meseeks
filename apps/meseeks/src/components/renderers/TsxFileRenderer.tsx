import { useMemo } from 'react';
import { useThemeVariables } from '~/hooks/useThemeVariables';
import { generateTsxIframeHtml } from '~/lib/iframe-generator';

interface TsxFileRendererProps {
	//
	content: string;
}

export function TsxFileRenderer({ content }: TsxFileRendererProps) {
	//
	const { themeVariables } = useThemeVariables();
	const iframeHtml = useMemo(() => generateTsxIframeHtml(content, themeVariables), [content, themeVariables]);

	return (
		<iframe
			srcDoc={iframeHtml}
			title="Rendered TSX"
			className="block h-full min-h-full w-full border-none bg-background"
			sandbox="allow-scripts"
			referrerPolicy="no-referrer"
		/>
	);
}
