import type { ReactNode } from 'react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { cn } from '~/lib/utils';
import { MermaidBlock, readMermaidSource } from './MermaidBlock';
import { resolveTaskAssetUrl } from './mdxAssets';

export type MdxComponentProps = {
	children?: ReactNode;
	className?: string;
	href?: string;
	src?: string;
	alt?: string;
} & Record<string, unknown>;

export function createMdxComponents(
	assetBasePath: string | null | undefined,
): Record<string, (props: MdxComponentProps) => ReactNode> {
	//
	return {
		Button,
		Input,
		Textarea,
		a: ({ children, href }) => (
			<a
				href={resolveTaskAssetUrl(href, assetBasePath)}
				target="_blank"
				rel="noopener noreferrer"
				className="text-blue-600 hover:text-blue-500 underline break-all"
			>
				{children}
			</a>
		),
		h1: ({ children }) => <h1 className="text-2xl font-bold mt-6 mb-2 text-foreground">{children}</h1>,
		h2: ({ children }) => <h2 className="text-xl font-bold mt-5 mb-2 text-foreground">{children}</h2>,
		h3: ({ children }) => <h3 className="text-lg font-semibold mt-4 mb-2 text-foreground">{children}</h3>,
		h4: ({ children }) => <h4 className="text-base font-semibold mt-3 mb-2 text-foreground">{children}</h4>,
		h5: ({ children }) => <h5 className="text-sm font-semibold mt-2 mb-1 text-foreground">{children}</h5>,
		h6: ({ children }) => <h6 className="text-xs font-semibold mt-2 mb-1 text-muted-foreground">{children}</h6>,
		p: ({ children }) => <p className="my-2 leading-7 text-foreground/95">{children}</p>,
		ul: ({ children }) => <ul className="my-3 list-disc pl-6 space-y-1 text-foreground/95">{children}</ul>,
		ol: ({ children }) => <ol className="my-3 list-decimal pl-6 space-y-1 text-foreground/95">{children}</ol>,
		li: ({ children }) => <li className="leading-7">{children}</li>,
		blockquote: ({ children }) => (
			<blockquote className="my-4 border-l-4 border-border pl-4 italic text-muted-foreground">
				{children}
			</blockquote>
		),
		hr: () => <hr className="my-4 border-t border-border" />,
		table: ({ children }) => <table className="my-4 w-full border-collapse text-sm">{children}</table>,
		thead: ({ children }) => <thead className="bg-muted/60">{children}</thead>,
		tbody: ({ children }) => <tbody>{children}</tbody>,
		tr: ({ children }) => <tr className="even:bg-muted/30">{children}</tr>,
		th: ({ children }) => <th className="border border-border px-2 py-1.5 text-left font-semibold">{children}</th>,
		td: ({ children }) => <td className="border border-border px-2 py-1.5 align-top">{children}</td>,
		img: ({ src, alt }) => (
			<img
				src={resolveTaskAssetUrl(src, assetBasePath)}
				alt={typeof alt === 'string' ? alt : undefined}
				className="my-4 h-auto max-w-full rounded-md border border-border"
			/>
		),
		video: ({ children, src }) => (
			<video
				controls
				src={resolveTaskAssetUrl(src, assetBasePath)}
				className="my-4 max-h-[40rem] w-full rounded-md border border-border bg-black"
			>
				{children}
			</video>
		),
		source: ({ src }) => <source src={resolveTaskAssetUrl(src, assetBasePath)} />,
		strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
		em: ({ children }) => <em className="italic text-foreground/95">{children}</em>,
		del: ({ children }) => <del className="line-through text-muted-foreground">{children}</del>,
		pre: ({ children, className }) => {
			const mermaidSource = readMermaidSource(children);
			if (mermaidSource) return <MermaidBlock source={mermaidSource} />;

			return (
				<pre
					className={cn(
						'bg-muted text-foreground rounded-md p-3 overflow-x-auto text-sm border border-border',
						className,
					)}
				>
					{children}
				</pre>
			);
		},
		code: ({ children, className }) => (
			<code className={cn('bg-muted rounded px-1.5 py-0.5 text-sm', className)}>{children}</code>
		),
	};
}
