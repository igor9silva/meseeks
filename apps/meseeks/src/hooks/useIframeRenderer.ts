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
	// Extract theme variables and watch for changes
	const { themeVariables } = useThemeVariables();
	const iframeHtml = code ? generateIframeHtml(code, themeVariables) : null;

	return {
		iframeHtml,
	};
}
