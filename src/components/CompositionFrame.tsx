import { BasicError } from '~/components/BasicError';
import { Loading } from '~/components/Loading';
import { useIframeRenderer } from '~/hooks/useIframeRenderer';

interface CompositionFrameProps {
	//
	code: string | undefined;
	title: string;
	errorText: string;
}

export function CompositionFrame({ code, title, errorText }: CompositionFrameProps) {
	//
	const hasCode = typeof code === 'string' && code.length > 0;
	const { dataUrl } = useIframeRenderer({ code: hasCode ? code : undefined });

	if (!hasCode) return <BasicError text={errorText} />;
	if (!dataUrl) return <Loading className="h-svh" text="Rendering..." />;

	// TODO: unify all <iframe>
	return <iframe src={dataUrl} title={title} className="fixed inset-0 z-50 h-full w-full border-none" />;
}
