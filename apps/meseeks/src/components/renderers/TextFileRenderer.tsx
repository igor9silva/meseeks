interface TextFileRendererProps {
	//
	content: string;
}

export function TextFileRenderer({ content }: TextFileRendererProps) {
	//
	return (
		<pre className="h-full w-full overflow-auto bg-background p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap">
			{content}
		</pre>
	);
}
