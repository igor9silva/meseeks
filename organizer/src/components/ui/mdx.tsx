import { Component, type ReactNode } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { useMDX } from "~/hooks/useMDX";
import { cn } from "~/lib/utils";

type MdxComponentProps = {
	children?: ReactNode;
	className?: string;
	href?: string;
} & Record<string, unknown>;

type RuntimeMdxComponent = (props: Record<string, unknown>) => ReactNode;

interface MdxErrorBoundaryState {
	hasError: boolean;
}

class MdxErrorBoundary extends Component<
	{ fallback: ReactNode; children: ReactNode },
	MdxErrorBoundaryState
> {
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
	return typeof value === "function";
}

const mdxComponents: Record<string, (props: MdxComponentProps) => ReactNode> = {
	Button,
	Input,
	Textarea,
	a: ({ children, href }) => (
		<a
			href={typeof href === "string" ? href : undefined}
			target="_blank"
			rel="noopener noreferrer"
			className="text-blue-600 hover:text-blue-500 underline break-all"
		>
			{children}
		</a>
	),
	pre: ({ children, className }) => (
		<pre
			className={cn(
				"bg-muted text-foreground rounded-md p-3 overflow-x-auto text-sm border border-border",
				className,
			)}
		>
			{children}
		</pre>
	),
	code: ({ children, className }) => (
		<code className={cn("bg-muted rounded px-1.5 py-0.5 text-sm", className)}>
			{children}
		</code>
	),
};

export function Mdx({ text, className }: { text: string; className?: string }) {
	//
	const { component, error, isPending } = useMDX(text);

	if (isPending) {
		return (
			<div className="text-sm text-muted-foreground">
				Rendering task content...
			</div>
		);
	}

	const fallback = (
		<div className="space-y-2">
			<div className="text-sm text-destructive">
				Could not render MDX. Showing raw content.
			</div>
			<pre className="bg-muted rounded-md p-3 overflow-x-auto whitespace-pre-wrap text-sm">
				{text}
			</pre>
		</div>
	);

	if (error) return fallback;
	if (!isRuntimeMdxComponent(component)) return fallback;

	return (
		<div
			className={cn("prose prose-sm max-w-none dark:prose-invert", className)}
		>
			<MdxErrorBoundary fallback={fallback}>
				{component({ components: mdxComponents })}
			</MdxErrorBoundary>
		</div>
	);
}
