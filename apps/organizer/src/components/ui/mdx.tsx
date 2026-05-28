import type { ReactNode } from 'react';
import { useMDX } from '~/hooks/useMDX';
import { cn } from '~/lib/utils';
import { MdxErrorBoundary } from './mdx/MdxErrorBoundary';
import { rewriteRawMdxAssetUrls } from './mdx/mdxAssets';
import { createMdxComponents } from './mdx/mdxComponents';

type RuntimeMdxComponent = (props: Record<string, unknown>) => ReactNode;

function isRuntimeMdxComponent(value: unknown): value is RuntimeMdxComponent {
	//
	return typeof value === 'function';
}

export function Mdx({
	text,
	className,
	assetBasePath,
}: {
	text: string;
	className?: string;
	assetBasePath?: string | null;
}) {
	//
	const compiledText = rewriteRawMdxAssetUrls(text, assetBasePath);
	const { component, error, isPending } = useMDX(compiledText);
	const mdxComponents = createMdxComponents(assetBasePath);

	if (isPending) {
		return <div className="text-sm text-muted-foreground">Rendering task content…</div>;
	}

	const fallback = (
		<div className="space-y-2">
			<div className="text-sm text-destructive">Could not render MDX. Showing raw content.</div>
			<pre className="bg-muted rounded-md p-3 overflow-x-auto whitespace-pre-wrap text-sm">{text}</pre>
		</div>
	);

	if (error) return fallback;
	if (!isRuntimeMdxComponent(component)) return fallback;

	return (
		<div className={cn('max-w-none text-sm', className)}>
			<MdxErrorBoundary fallback={fallback}>{component({ components: mdxComponents })}</MdxErrorBoundary>
		</div>
	);
}
