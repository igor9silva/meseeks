export function DepthRangeControl({
	minDepth,
	maxDepth,
	onDepthRangeChange,
}: {
	minDepth: number;
	maxDepth: number;
	onDepthRangeChange: (minDepth: number, maxDepth: number) => void;
}) {
	//
	const depthOptions = Array.from({ length: 16 }, (_, index) => index + 1);

	return (
		<div className="flex h-8 items-center gap-1 rounded-md border border-input bg-background px-2 text-xs text-muted-foreground">
			<span>Depth</span>
			<select
				aria-label="Minimum depth"
				value={minDepth}
				onChange={(event) => {
					const nextMinDepth = Number(event.currentTarget.value);
					onDepthRangeChange(nextMinDepth, Math.max(nextMinDepth, maxDepth));
				}}
				className="h-6 rounded bg-transparent text-foreground outline-none"
			>
				{depthOptions.map((depth) => (
					<option key={depth} value={depth}>
						{depth}
					</option>
				))}
			</select>
			<span className="text-muted-foreground/70">-</span>
			<select
				aria-label="Maximum depth"
				value={maxDepth}
				onChange={(event) => {
					const nextMaxDepth = Number(event.currentTarget.value);
					onDepthRangeChange(Math.min(minDepth, nextMaxDepth), nextMaxDepth);
				}}
				className="h-6 rounded bg-transparent text-foreground outline-none"
			>
				{depthOptions.map((depth) => (
					<option key={depth} value={depth}>
						{depth}
					</option>
				))}
			</select>
		</div>
	);
}
