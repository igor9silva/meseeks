import { Children, Component, isValidElement, type ReactNode, useEffect, useId, useState } from 'react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { useMDX } from '~/hooks/useMDX';
import { cn } from '~/lib/utils';

type MdxComponentProps = {
	children?: ReactNode;
	className?: string;
	href?: string;
} & Record<string, unknown>;

type RuntimeMdxComponent = (props: Record<string, unknown>) => ReactNode;

interface MdxErrorBoundaryState {
	hasError: boolean;
}

interface ElementWithChildrenProps {
	children?: ReactNode;
	className?: string;
}

let hasInitializedMermaid = false;

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

function readNodeText(node: ReactNode): string {
	//
	if (typeof node === 'string') return node;
	if (typeof node === 'number') return String(node);
	if (isValidElement<ElementWithChildrenProps>(node)) {
		return readNodeText(node.props.children);
	}
	if (!Array.isArray(node)) return '';

	return node.map((entry) => readNodeText(entry)).join('');
}

function hasMermaidClassName(className: string): boolean {
	//
	const classTokens = className.split(/\s+/).filter((token) => token.length > 0);
	return classTokens.includes('language-mermaid');
}

function looksLikeMermaidSource(source: string): boolean {
	//
	const firstLine = source
		.split('\n')
		.map((line) => line.trim())
		.find((line) => line.length > 0);

	if (!firstLine) return false;

	const knownStarts = [
		'flowchart ',
		'graph ',
		'sequenceDiagram',
		'classDiagram',
		'stateDiagram',
		'erDiagram',
		'journey',
		'gantt',
		'pie ',
		'mindmap',
		'timeline',
		'gitGraph',
	];

	return knownStarts.some((entry) => firstLine.startsWith(entry));
}

function findMermaidSource(node: ReactNode): string | null {
	//
	if (node === null || node === undefined || typeof node === 'boolean') {
		return null;
	}

	if (Array.isArray(node)) {
		for (const entry of node) {
			const source = findMermaidSource(entry);
			if (source) return source;
		}
		return null;
	}

	if (!isValidElement<ElementWithChildrenProps>(node)) return null;

	const className = typeof node.props.className === 'string' ? node.props.className : '';
	const source = readNodeText(node.props.children).trim();

	if (source.length > 0) {
		if (hasMermaidClassName(className)) return source;
		if (looksLikeMermaidSource(source)) return source;
	}

	return findMermaidSource(node.props.children);
}

function readMermaidSource(children: ReactNode): string | null {
	//
	const childrenList = Children.toArray(children);
	for (const child of childrenList) {
		const source = findMermaidSource(child);
		if (source) return source;
	}

	if (childrenList.length === 0) return null;

	const blockSource = readNodeText(children).trim();
	if (!looksLikeMermaidSource(blockSource)) return null;
	return blockSource;
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

function MermaidBlock({ source }: { source: string }) {
	//
	const blockId = useId();
	const [svg, setSvg] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let isActive = true;
		const diagramId = toMermaidDomId(blockId);

		setSvg(null);
		setError(null);

		void renderMermaidSvg(diagramId, source)
			.then((nextSvg) => {
				if (!isActive) return;
				setSvg(nextSvg);
			})
			.catch((renderError: unknown) => {
				if (!isActive) return;

				const message = renderError instanceof Error ? renderError.message : 'unknown render error';
				setError(message);
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
		return <div className="text-sm text-muted-foreground">Rendering Mermaid diagram...</div>;
	}

	return (
		<div className="rounded-md border border-border bg-background p-3 overflow-x-auto max-h-[50rem]">
			<img alt="Mermaid diagram" className="max-w-none" src={toSvgDataUrl(svg)} />
		</div>
	);
}

class MdxErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, MdxErrorBoundaryState> {
	state: MdxErrorBoundaryState = { hasError: false };

	static getDerivedStateFromError(): MdxErrorBoundaryState {
		//
		return { hasError: true };
	}

	componentDidUpdate(
		prevProps: Readonly<{
			fallback: ReactNode;
			children: ReactNode;
		}>,
	) {
		//
		if (prevProps.children !== this.props.children && this.state.hasError) {
			this.setState({ hasError: false });
		}
	}

	render() {
		//
		if (this.state.hasError) return this.props.fallback;
		return this.props.children;
	}
}

function isRuntimeMdxComponent(value: unknown): value is RuntimeMdxComponent {
	//
	return typeof value === 'function';
}

const mdxComponents: Record<string, (props: MdxComponentProps) => ReactNode> = {
	Button,
	Input,
	Textarea,
	a: ({ children, href }) => (
		<a
			href={typeof href === 'string' ? href : undefined}
			target="_blank"
			rel="noopener noreferrer"
			className="text-blue-600 hover:text-blue-500 underline break-all"
		>
			{children}
		</a>
	),
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

export function Mdx({ text, className }: { text: string; className?: string }) {
	//
	const { component, error, isPending } = useMDX(text);

	if (isPending) {
		return <div className="text-sm text-muted-foreground">Rendering task content...</div>;
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
		<div className={cn('prose prose-sm max-w-none dark:prose-invert', className)}>
			<MdxErrorBoundary fallback={fallback}>{component({ components: mdxComponents })}</MdxErrorBoundary>
		</div>
	);
}
