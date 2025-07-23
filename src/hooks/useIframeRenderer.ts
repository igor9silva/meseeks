import { useEffect, useState } from 'react';
import { useThemeVariables } from '~/hooks/useThemeVariables';
import { generateIframeHtml } from '~/lib/iframe-generator';

interface UseIframeRendererProps {
	code: string | undefined;
}

/**
 * Hook to manage iframe data URL generation
 * Simple approach - just manages the data URL and ready state
 */
export function useIframeRenderer({ code }: UseIframeRendererProps) {
	//
	const [dataUrl, setDataUrl] = useState<string | null>(null);

	// Extract theme variables and watch for changes
	const { themeVariables } = useThemeVariables();

	// Generate iframe HTML and data URL (only when code or theme changes)
	useEffect(() => {
		//
		if (!code) {
			setDataUrl(null);
			return;
		}

		const isolatedHtml = generateIframeHtml(code, themeVariables);
		const url = 'data:text/html;charset=utf-8,' + encodeURIComponent(isolatedHtml);

		setDataUrl(url);

		// Cleanup previous data URL
		return () => {
			if (dataUrl) {
				URL.revokeObjectURL(dataUrl);
			}
		};
	}, [code, themeVariables]);

	return {
		dataUrl,
	};
}
