import { Doc, Id } from 'convex/_generated/dataModel';
import { asDollars } from 'convex/utils/money';
import { useEffect, useState } from 'react';
import { TimeAgo } from '~/components/TimeAgo';
import { Badge } from '~/components/ui/badge';
import { Card, CardContent, CardTitle } from '~/components/ui/card';
import { cn } from '~/lib/utils';

// Recursive component to display structured data
function StructuredValue({ value, depth = 0 }: { value: any; depth?: number }) {
	//
	if (value === null) return <span className="text-muted-foreground">null</span>;
	if (value === undefined) return <span className="text-muted-foreground">undefined</span>;

	if (typeof value === 'string')
		return <span className="text-green-400 whitespace-pre-wrap break-normal hyphens-auto">"{value}"</span>;
	if (typeof value === 'number') return <span className="text-amber-400">{value}</span>;
	if (typeof value === 'boolean') return <span className="text-purple-400">{value ? 'true' : 'false'}</span>;

	if (Array.isArray(value)) {
		if (value.length === 0) return <span className="text-muted-foreground">[]</span>;

		return (
			<div className="ml-2">
				<span>[</span>
				<div className="ml-4">
					{value.map((item, index) => (
						<div key={index} className="flex gap-1">
							<StructuredValue value={item} depth={depth + 1} />
							{index < value.length - 1 && <span>,</span>}
						</div>
					))}
				</div>
				<span>]</span>
			</div>
		);
	}

	if (typeof value === 'object') {
		const entries = Object.entries(value);
		if (entries.length === 0) return <span className="text-muted-foreground">{'{}'}</span>;

		return (
			<div className="ml-2">
				<span>{'{'}</span>
				<div className="ml-4">
					{entries.map(([key, val], index) => (
						<div key={key} className="flex gap-1">
							<span className="font-semibold flex-shrink-0 text-blue-400">{key}:</span>{' '}
							<StructuredValue value={val} depth={depth + 1} />
							{index < entries.length - 1 && <span>,</span>}
						</div>
					))}
				</div>
				<span>{'}'}</span>
			</div>
		);
	}

	return <span className="text-muted-foreground">{String(value)}</span>;
}

export function DebugAction({
	className, //
	action,
	initialRenderDate,
	isAuthorCurrentUser,
	taskId,
}: {
	className?: string;
	action: Doc<'actions'>;
	initialRenderDate: Date;
	isAuthorCurrentUser: boolean;
	taskId: Id<'tasks'>;
}) {
	//
	// Track if this action is currently highlighted by URL
	const [isHighlighted, setIsHighlighted] = useState(false);

	// Check if this action is the one in the URL hash
	useEffect(() => {
		//
		const checkIfHighlighted = () => {
			const hash = window.location.hash;
			setIsHighlighted(hash === `#action-${action._id}`);
		};

		// Check on mount and whenever the hash changes
		checkIfHighlighted();
		window.addEventListener('hashchange', checkIfHighlighted);

		return () => {
			window.removeEventListener('hashchange', checkIfHighlighted);
		};
	}, [action._id]);

	// Format creation time as a readable string
	const creationTime = new Date(action._creationTime).toLocaleString();

	// Status color map
	const statusColorMap: Record<string, string> = {
		'running': 'bg-blue-500',
		'succeeded': 'bg-green-500',
		'failed': 'bg-red-500',
		'skipped': 'bg-gray-500',
		'pending authorization': 'bg-yellow-500',
	};
	const defaultStatusColor = 'bg-slate-500';

	return (
		<Card className={cn('overflow-hidden', isHighlighted && 'ring-2 ring-primary ring-offset-2', className)}>
			{/* <CardHeader className="">
			</CardHeader> */}
			<CardContent className="space-y-2">
				<div className="flex items-center justify-between">
					<CardTitle id={`action-${action._id}`} className="text-lg">
						{action.skillKey} ({action.depth}){' '}
						<span className="font-mono text-xs text-muted-foreground">{action._id}</span>
					</CardTitle>
					<Badge className={cn('ml-2', statusColorMap[action.status] ?? defaultStatusColor)}>
						{action.status}
					</Badge>
				</div>
				<div className="text-sm text-muted-foreground flex justify-between items-center">
					<TimeAgo date={action._creationTime} />

					{action.author &&
						(isAuthorCurrentUser ? (
							<span>You</span>
						) : (
							<a href={`#action-${action.author}`} className="text-blue-400 hover:underline">
								{`Author: ${action.author}`}
							</a>
						))}
				</div>
				{/* <div>
					<h3 className="font-medium mb-1">{action.skillKey}</h3>
					{/* <div className="p-2 bg-muted rounded-md font-mono">{action.skillKey}</div> *
				</div> */}

				{action.args && Object.keys(action.args).length > 0 && (
					<div>
						<h3 className="font-medium mb-1">Arguments</h3>
						<div className="bg-muted rounded-md border p-2 overflow-auto min-h-[32px] max-h-64">
							<div className="font-mono">
								<StructuredValue value={action.args} />
							</div>
						</div>
					</div>
				)}

				{action.result && (
					<div>
						<h3 className="font-medium mb-1">Result</h3>
						<div className="bg-muted rounded-md border p-2 overflow-auto min-h-[32px] max-h-64">
							<div className="font-mono">
								{action.result.text && (
									<div className="mb-2">
										<div className="text-xs text-muted-foreground mb-1">Text:</div>
										<StructuredValue value={action.result.text} />
									</div>
								)}
								{action.result.reactions && action.result.reactions.length > 0 && (
									<div>
										<div className="text-xs text-muted-foreground mb-1">Reactions:</div>
										<StructuredValue value={action.result.reactions} />
									</div>
								)}
								{!action.result.text &&
									(!action.result.reactions || action.result.reactions.length === 0) && (
										<StructuredValue value={action.result} />
									)}
							</div>
						</div>
					</div>
				)}

				{typeof action.estimatedCost === 'bigint' && (
					<div>
						<h3 className="font-medium mb-1">Estimated Cost</h3>
						<div className="p-2 bg-muted rounded-md">
							${asDollars({ bigInt: action.estimatedCost, precision: 6 })}
						</div>
					</div>
				)}

				{(action.status === 'succeeded' || action.status === 'skipped' || action.status === 'failed') &&
					action.costs &&
					action.costs.length > 0 && (
						<div>
							<h3 className="font-medium mb-1">Costs</h3>
							<div className="p-2 bg-muted rounded-md">
								<ul className="space-y-1">
									{action.costs.map((cost, index) => (
										<li key={index} className="flex justify-between">
											<span>
												{cost.description} ({cost.symbol})
											</span>
											<span className="font-mono">
												${asDollars({ bigInt: cost.amount, precision: 6 })}
											</span>
										</li>
									))}
								</ul>
							</div>
						</div>
					)}

				{/* <div>
					<h3 className="font-medium mb-1">Task ID</h3>
					<div className="p-2 bg-muted rounded-md font-mono">{taskId}</div>
				</div> */}

				{/* <div>
					<h3 className="font-medium mb-1">Raw Action Data</h3>
					<div className="p-2 bg-muted rounded-md overflow-auto max-h-96 font-mono">
						<StructuredValue value={action} />
					</div>
				</div> */}
			</CardContent>
		</Card>
	);
}
