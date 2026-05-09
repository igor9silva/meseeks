import { useEffect, useState } from 'react';
import { useThemeVariables } from '~/hooks/useThemeVariables';
import { generateIframeHtml } from '~/lib/iframe-generator';

interface UseIframeRendererProps {
	code: string | undefined;
}

/**
 * hook to manage iframe html generation
 * simple approach - just manages html and ready state
 */
export function useIframeRenderer({ code }: UseIframeRendererProps) {
	//
	const [iframeHtml, setIframeHtml] = useState<string | null>(null);

	// Extract theme variables and watch for changes
	const { themeVariables } = useThemeVariables();

	// Generate iframe HTML (only when code or theme changes)
	useEffect(() => {
		//
		if (!code) {
			setIframeHtml(null);
			return;
		}

		const isolatedHtml = generateIframeHtml(code, themeVariables);
		setIframeHtml(isolatedHtml);
		//
	}, [code, themeVariables]);

	return {
		iframeHtml,
	};
}
