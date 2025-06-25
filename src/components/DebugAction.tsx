import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { api } from 'convex/_generated/api';
import type { Doc, Id } from 'convex/_generated/dataModel';
import { asDollars } from 'convex/lib/money';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loading } from '~/components/Loading';
import { TimeAgo } from '~/components/TimeAgo';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { cn } from '~/lib/utils';

// Copy to clipboard helper
const copyToClipboard = (text: string) => {
	navigator.clipboard.writeText(text);
};

// Format date for tooltip
const formatLocalDate = (timestamp: number) => {
	const date = new Date(timestamp);
	return date.toLocaleDateString('en-US', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		timeZoneName: 'short',
	});
};

// Status dot colors
const getStatusDot = (status: string) => {
	const statusMap: Record<string, string> = {
		'succeeded': 'bg-green-500',
		'failed': 'bg-red-500',
		'running': 'bg-blue-500',
		'skipped': 'bg-gray-500',
		'pending authorization': 'bg-yellow-500',
	};
	return statusMap[status] || 'bg-gray-500';
};

// Author display component
function AuthorSection({ action, isAuthorCurrentUser }: { action: Doc<'actions'>; isAuthorCurrentUser: boolean }) {
	//
	if (!action.author) return null;

	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();

		if (!isAuthorCurrentUser) {
			const authorElement = document.getElementById(`action-${action.author}`);
			if (authorElement) {
				authorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
				window.location.hash = `#action-${action.author}`;
			}
		}

		copyToClipboard(action.author);
		toast.success('Copied ID to clipboard');
	};

	return (
		<div className="text-xs text-muted-foreground">
			{isAuthorCurrentUser ? (
				<>
					Performed by{' '}
					<code
						className="hover:text-foreground cursor-pointer underline-offset-2 hover:underline"
						onClick={handleClick}
					>
						you
					</code>
					.
				</>
			) : (
				<>
					Performed as a reaction from{' '}
					<code
						className="hover:text-foreground cursor-pointer underline-offset-2 hover:underline"
						onClick={handleClick}
					>
						{action.author}
					</code>
					.
				</>
			)}
		</div>
	);
}

// Arguments display component
function ArgumentsSection({ args }: { args: Record<string, unknown> }) {
	//
	if (!args || Object.keys(args).length === 0) return null;

	const [isOpen, setIsOpen] = useState(false);

	return (
		<div>
			<div
				className="flex items-baseline gap-2 text-sm font-medium mb-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
				onClick={() => setIsOpen(!isOpen)}
			>
				{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
				Arguments
				<span className="text-muted-foreground font-normal text-xs">({Object.keys(args).length})</span>
			</div>
			{isOpen && (
				<div className="bg-muted border rounded p-3 text-sm space-y-1 max-h-48 overflow-auto resize-y">
					{Object.entries(args).map(([key, value]) => (
						<div key={key} className="flex gap-2">
							<span className="text-blue-600 dark:text-blue-400 font-medium flex-shrink-0">{key}:</span>
							<span className="whitespace-pre-wrap break-words">
								{typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
							</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

// Individual reaction component
function ReactionItem({ reaction, index }: { reaction: any; index: number }) {
	//
	const [isOpen, setIsOpen] = useState(false);
	const argCount = reaction.args ? Object.keys(reaction.args).length : 0;

	// Format argument count text
	const getArgumentText = (count: number) => {
		return count === 1 ? `${count} argument` : `${count} arguments`;
	};

	return (
		<div className="ml-4">
			<div
				className="flex items-baseline gap-2 text-sm font-medium mb-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
				onClick={() => setIsOpen(!isOpen)}
			>
				{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
				{reaction.skillKey}
				<span className="text-muted-foreground font-normal text-xs">({getArgumentText(argCount)})</span>
			</div>
			{isOpen &&
				(argCount > 0 ? (
					<div className="bg-muted border rounded p-3 text-sm space-y-1 max-h-48 overflow-auto resize-y">
						{Object.entries(reaction.args).map(([key, value]) => (
							<div key={key} className="flex gap-2">
								<span className="text-blue-600 dark:text-blue-400 font-medium flex-shrink-0">
									{key}:
								</span>
								<span className="whitespace-pre-wrap break-words">
									{typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
								</span>
							</div>
						))}
					</div>
				) : (
					<div className="bg-muted border rounded p-3 text-sm text-muted-foreground italic">No arguments</div>
				))}
		</div>
	);
}

// Result display component
function ResultSection({ result }: { result: Doc<'actions'>['result'] }) {
	//
	if (!result) return null;

	const [isOpen, setIsOpen] = useState(false);
	const hasText = Boolean(result.text);
	const hasReactions = Boolean(result.reactions && result.reactions.length > 0);

	// If neither text nor reactions, fallback to JSON
	if (!hasText && !hasReactions) {
		const jsonString = JSON.stringify(result, null, 2);
		return (
			<div>
				<div
					className="flex items-baseline gap-2 text-sm font-medium mb-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
					onClick={() => setIsOpen(!isOpen)}
				>
					{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
					Result
					<span className="text-muted-foreground font-normal text-xs">({jsonString.length} characters)</span>
				</div>
				{isOpen && (
					<textarea
						value={jsonString}
						readOnly
						className="w-full min-h-32 max-h-96 p-3 text-xs bg-muted border rounded resize-y whitespace-pre-wrap font-mono"
						style={{ fontFamily: 'ui-monospace, monospace' }}
					/>
				)}
			</div>
		);
	}

	// Calculate summary for the main header
	let summary = '';
	if (hasText && hasReactions) {
		summary = `(${result.text!.length} characters, ${result.reactions!.length} reactions)`;
	} else if (hasText) {
		summary = `(${result.text!.length} characters)`;
	} else if (hasReactions) {
		summary = `(${result.reactions!.length} reactions)`;
	}

	return (
		<div>
			<div
				className="flex items-baseline gap-2 text-sm font-medium mb-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
				onClick={() => setIsOpen(!isOpen)}
			>
				{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
				Result
				<span className="text-muted-foreground font-normal text-xs">{summary}</span>
			</div>
			{isOpen && (
				<div className="space-y-3">
					{/* Text block - no labels, no container, just the text */}
					{hasText && (
						<textarea
							value={result.text!}
							readOnly
							className="w-full min-h-32 max-h-96 p-3 text-sm bg-muted border rounded resize-y whitespace-pre-wrap"
							style={{ fontFamily: 'inherit' }}
						/>
					)}

					{/* Reactions as individual collapsible blocks */}
					{hasReactions && (
						<div className="space-y-2">
							{result.reactions!.map((reaction, index) => (
								<ReactionItem key={index} reaction={reaction} index={index} />
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}

// Cost display component
function CostSection({ action }: { action: Doc<'actions'> }) {
	//
	const hasEstimatedCost = typeof action.estimatedCost === 'bigint';
	const hasActualCosts = 'costs' in action && action.costs && action.costs.length > 0;

	if (!hasEstimatedCost && !hasActualCosts) return null;

	const [isOpen, setIsOpen] = useState(false);
	const estimatedAmount = hasEstimatedCost ? action.estimatedCost! : 0n;
	const actualTotal = hasActualCosts ? action.costs.reduce((total, cost) => total + cost.amount, 0n) : 0n;

	return (
		<div className="space-y-3">
			{hasActualCosts && (
				<div>
					<div
						className="flex items-baseline gap-2 text-sm font-medium mb-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
						onClick={() => setIsOpen(!isOpen)}
					>
						{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
						Cost Breakdown ${asDollars({ bigInt: actualTotal, precision: 6 })}
						<span className="text-muted-foreground font-normal text-xs">
							{actualTotal === estimatedAmount ? (
								<>(estimated correctly)</>
							) : estimatedAmount > 0n ? (
								(() => {
									const actualFloat = Number(actualTotal) / 1000000; // Convert to dollars
									const estimatedFloat = Number(estimatedAmount) / 1000000;
									const percentDiff = Math.abs(
										((actualFloat - estimatedFloat) / estimatedFloat) * 100,
									);
									const isLess = actualTotal < estimatedAmount;
									return (
										<>
											({percentDiff.toFixed(0)}% {isLess ? 'less' : 'greater'} than $
											{asDollars({ bigInt: estimatedAmount, precision: 6 })} estimated)
										</>
									);
								})()
							) : (
								<>(from ${asDollars({ bigInt: estimatedAmount, precision: 6 })} estimated)</>
							)}
						</span>
					</div>
					{isOpen && (
						<div className="bg-muted border rounded p-3 space-y-1 text-sm">
							{action.costs.map((cost, index) => (
								<div key={index} className="flex justify-between">
									<span>{cost.description}</span>
									<span className="font-mono">
										${asDollars({ bigInt: cost.amount, precision: 6 })} USDc
									</span>
								</div>
							))}
						</div>
					)}
				</div>
			)}

			{hasEstimatedCost && !hasActualCosts && (
				<div>
					<div
						className="flex items-baseline gap-2 text-sm font-medium mb-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
						onClick={() => setIsOpen(!isOpen)}
					>
						{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
						Estimated Cost
						<span className="text-muted-foreground font-normal text-xs">
							(${asDollars({ bigInt: action.estimatedCost!, precision: 6 })})
						</span>
					</div>
					{isOpen && (
						<div className="bg-muted border rounded p-3 text-sm">
							<div className="flex justify-between">
								<span>Estimated:</span>
								<span className="font-mono">
									${asDollars({ bigInt: action.estimatedCost!, precision: 6 })} USDc
								</span>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

// LLM details section
function LlmDetailsSection({ actionDetails }: { actionDetails: any }) {
	//
	if (!actionDetails.llm) return null;

	const llm = actionDetails.llm;

	return (
		<div className="space-y-3">
			<div className="grid grid-cols-4 gap-4 text-sm">
				<div className="col-span-2">
					<span className="text-muted-foreground">Model</span>
					<div className="font-mono truncate" title={`${llm.model} (${llm.temperature || 'N/A'} 🌡️)`}>
						{llm.model} ({llm.temperature || 'N/A'} 🌡️)
					</div>
				</div>
				<div>
					<span className="text-muted-foreground">Finish Reason</span>
					<div className="font-mono truncate" title={llm.finishReason}>
						{llm.finishReason}
					</div>
				</div>
				<div>
					<span className="text-muted-foreground">Tokens</span>
					<Tooltip>
						<TooltipTrigger asChild>
							<div className="font-mono cursor-pointer hover:text-blue-600 dark:hover:text-blue-400">
								{llm.usage.input.total} → {llm.usage.output.total}
							</div>
						</TooltipTrigger>
						<TooltipContent side="bottom" align="center" className="max-w-sm">
							<div className="space-y-1 text-xs">
								<div>Input tokens: {llm.usage.input.total.toLocaleString()}</div>
								<div>Output tokens: {llm.usage.output.total.toLocaleString()}</div>
							</div>
						</TooltipContent>
					</Tooltip>
				</div>
			</div>

			{llm.availableTools && llm.availableTools.length > 0 && (
				<div>
					<div className="text-sm font-medium mb-2">Available Tools</div>
					<div className="flex flex-wrap gap-1">
						{llm.availableTools.map((tool: string) => (
							<Badge key={tool} variant="secondary" className="text-xs font-mono">
								{tool}
							</Badge>
						))}
					</div>
				</div>
			)}

			{llm.systemInstructions && (
				<div>
					<div className="text-sm font-medium mb-2">System Instructions</div>
					<textarea
						value={llm.systemInstructions}
						readOnly
						className="w-full min-h-32 max-h-96 p-3 text-sm bg-muted border rounded resize-y whitespace-pre-wrap"
						style={{ fontFamily: 'inherit' }}
					/>
				</div>
			)}

			{llm.toolCalls && llm.toolCalls.length > 0 && (
				<div>
					<div className="text-sm font-medium mb-2">Tool Calls</div>
					<textarea
						value={JSON.stringify(llm.toolCalls, null, 2)}
						readOnly
						className="w-full min-h-32 max-h-96 p-3 text-xs bg-muted border rounded resize-y whitespace-pre-wrap font-mono"
						style={{ fontFamily: 'ui-monospace, monospace' }}
					/>
				</div>
			)}

			{llm.text && (
				<div>
					<div className="text-sm font-medium mb-2">LLM Response</div>
					<textarea
						value={llm.text}
						readOnly
						className="w-full min-h-32 max-h-96 p-3 text-sm bg-muted border rounded resize-y whitespace-pre-wrap"
						style={{ fontFamily: 'inherit' }}
					/>
				</div>
			)}
		</div>
	);
}

// HTTP details section
function HttpDetailsSection({ actionDetails }: { actionDetails: any }) {
	//
	if (!actionDetails.http) return null;

	const http = actionDetails.http;
	const [searchParamsOpen, setSearchParamsOpen] = useState(false);
	const [responseBodyOpen, setResponseBodyOpen] = useState(false);
	const [responseHeadersOpen, setResponseHeadersOpen] = useState(false);

	// Parse URL to extract search params
	let searchParams: Record<string, string> = {};
	try {
		const url = new URL(http.url);
		searchParams = Object.fromEntries(url.searchParams.entries());
	} catch {
		// If URL parsing fails, ignore search params
	}

	return (
		<div className="space-y-3">
			<div>
				<div className="bg-muted border rounded p-3 font-mono text-sm flex justify-between items-center">
					<div className="flex items-center gap-1 min-w-0 flex-1">
						<Badge variant="outline" className="text-xs flex-shrink-0">
							{http.method}
						</Badge>
						<span className="text-muted-foreground truncate">{http.url.split('?')[0]}</span>
					</div>
					<Badge
						variant={http.statusCode >= 400 ? 'destructive' : 'default'}
						className="text-xs ml-2 flex-shrink-0"
					>
						{http.statusCode}
					</Badge>
				</div>
			</div>

			{Object.keys(searchParams).length > 0 && (
				<div>
					<div
						className="flex items-center gap-2 text-sm font-medium mb-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
						onClick={() => setSearchParamsOpen(!searchParamsOpen)}
					>
						{searchParamsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
						Search Parameters
						<span className="text-muted-foreground font-normal text-xs">
							({Object.keys(searchParams).length} parameters)
						</span>
					</div>
					{searchParamsOpen && (
						<div className="bg-muted border rounded p-3 text-sm space-y-1 max-h-48 overflow-auto resize-y">
							{Object.entries(searchParams).map(([key, value]) => (
								<div key={key} className="flex gap-2">
									<span className="text-blue-600 dark:text-blue-400 font-medium flex-shrink-0">
										{key}:
									</span>
									<span className="whitespace-pre-wrap break-words">{value}</span>
								</div>
							))}
						</div>
					)}
				</div>
			)}

			{http.responseBody && (
				<div>
					<div
						className="flex items-center gap-2 text-sm font-medium mb-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
						onClick={() => setResponseBodyOpen(!responseBodyOpen)}
					>
						{responseBodyOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
						Response Body
						{http.responseBodySize && (
							<span className="text-muted-foreground font-normal text-xs">
								({http.responseBodySize} bytes)
							</span>
						)}
					</div>
					{responseBodyOpen && (
						<textarea
							value={http.responseBody}
							readOnly
							className="w-full min-h-32 max-h-96 p-3 text-xs bg-muted border rounded resize-y whitespace-pre-wrap font-mono"
							style={{ fontFamily: 'ui-monospace, monospace' }}
						/>
					)}
				</div>
			)}

			{http.responseHeaders && Object.keys(http.responseHeaders).length > 0 && (
				<div>
					<div
						className="flex items-center gap-2 text-sm font-medium mb-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
						onClick={() => setResponseHeadersOpen(!responseHeadersOpen)}
					>
						{responseHeadersOpen ? (
							<ChevronDown className="h-4 w-4" />
						) : (
							<ChevronRight className="h-4 w-4" />
						)}
						Response Headers
						<span className="text-muted-foreground font-normal text-xs">
							({Object.keys(http.responseHeaders).length} headers)
						</span>
					</div>
					{responseHeadersOpen && (
						<div className="bg-muted border rounded p-3 text-sm space-y-1 max-h-48 overflow-auto resize-y">
							{Object.entries(http.responseHeaders).map(([key, value]) => (
								<div key={key} className="flex gap-2">
									<span className="text-blue-600 dark:text-blue-400 font-medium flex-shrink-0">
										{key}:
									</span>
									<span className="whitespace-pre-wrap break-words">{String(value)}</span>
								</div>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}

// Action details with suspense loading
function ActionDetailsContent({ action }: { action: Doc<'actions'> }) {
	//
	const query = convexQuery(api.action_details.public.findByAction, {
		actionId: action._id,
	});
	const { data: actionDetails } = useSuspenseQuery(query);

	if (!actionDetails) return null;

	return (
		<>
			{actionDetails.skillKind === 'soft' && <LlmDetailsSection actionDetails={actionDetails} />}
			{actionDetails.skillKind === 'hard' && <HttpDetailsSection actionDetails={actionDetails} />}
		</>
	);
}

// Main action row component
function ActionRow({
	action,
	isExpanded,
	onToggle,
	isAuthorCurrentUser,
}: {
	action: Doc<'actions'>;
	isExpanded: boolean;
	onToggle: () => void;
	isAuthorCurrentUser: boolean;
}) {
	//
	const statusDot = getStatusDot(action.status);

	// Calculate total actual cost
	const isResolvedAction = action.status === 'succeeded' || action.status === 'skipped' || action.status === 'failed';
	const totalActualCost =
		isResolvedAction && 'costs' in action && (action as any).costs && (action as any).costs.length > 0
			? (action as any).costs.reduce((sum: bigint, cost: any) => sum + cost.amount, 0n)
			: action.estimatedCost || 0n;

	return (
		<TooltipProvider>
			<div className="border-b">
				{/* Main row */}
				<div className="flex items-center py-2 px-4 hover:bg-muted/50 cursor-pointer group" onClick={onToggle}>
					<div className="flex items-center gap-2 min-w-0 flex-1">
						<Button variant="ghost" size="sm" className="h-4 w-4 p-0 opacity-60">
							{isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
						</Button>

						<div className={`w-2 h-2 rounded-full ${statusDot}`} />

						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-0.5 font-mono">
								<span className="text-sm">{action.skillKey} </span>
								<span className="text-muted-foreground text-xs">({action.depth})</span>
							</div>
							<code
								className="text-xs text-muted-foreground hover:text-foreground cursor-pointer block"
								onClick={(e) => {
									e.stopPropagation();
									copyToClipboard(action._id);
								}}
								title="Click to copy ID"
							>
								{action._id}
							</code>
						</div>
					</div>

					<div className="flex items-center gap-4 text-sm text-muted-foreground">
						<Tooltip>
							<TooltipTrigger asChild>
								<span
									className="hover:text-foreground cursor-pointer"
									onClick={(e) => {
										e.stopPropagation();
										copyToClipboard(new Date(action._creationTime).toISOString());
									}}
								>
									<TimeAgo date={action._creationTime} />
								</span>
							</TooltipTrigger>
							<TooltipContent side="top" className="max-w-sm">
								<div className="space-y-1">
									<div className="font-mono text-xs">
										{new Date(action._creationTime).toISOString()}
									</div>
									<div className="text-xs">{formatLocalDate(action._creationTime)}</div>
								</div>
							</TooltipContent>
						</Tooltip>

						<div className="text-right min-w-[80px]">
							<Tooltip>
								<TooltipTrigger asChild>
									<div className="text-xs font-mono cursor-pointer hover:text-foreground">
										${asDollars({ bigInt: totalActualCost, precision: 6 })}
									</div>
								</TooltipTrigger>
								<TooltipContent side="top">
									<div className="space-y-1 text-xs">
										{typeof action.estimatedCost === 'bigint' && action.estimatedCost > 0n && (
											<div>
												Estimated: ${asDollars({ bigInt: action.estimatedCost, precision: 6 })}
											</div>
										)}
										<div>Actual: ${asDollars({ bigInt: totalActualCost, precision: 6 })}</div>
									</div>
								</TooltipContent>
							</Tooltip>
						</div>
					</div>
				</div>

				{/* Expanded content */}
				{isExpanded && (
					<div className="bg-muted/30 border-t">
						<div className="p-4 space-y-4">
							<AuthorSection action={action} isAuthorCurrentUser={isAuthorCurrentUser} />

							<ArgumentsSection args={action.args} />
							<ResultSection result={action.result} />
							<CostSection action={action} />

							<Suspense fallback={<Loading className="h-20" />}>
								<ActionDetailsContent action={action} />
							</Suspense>
						</div>
					</div>
				)}
			</div>
		</TooltipProvider>
	);
}

export function DebugAction({
	className,
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
	const [isExpanded, setIsExpanded] = useState(false);
	const [isHighlighted, setIsHighlighted] = useState(false);

	// Check if this action is the one in the URL hash
	useEffect(() => {
		//
		const checkIfHighlighted = () => {
			const hash = window.location.hash;
			const shouldHighlight = hash === `#action-${action._id}`;
			setIsHighlighted(shouldHighlight);
			// Auto-expand if highlighted
			if (shouldHighlight) {
				setIsExpanded(true);
			}
		};

		// Check on mount and whenever the hash changes
		checkIfHighlighted();
		window.addEventListener('hashchange', checkIfHighlighted);

		return () => {
			window.removeEventListener('hashchange', checkIfHighlighted);
		};
	}, [action._id]);

	return (
		<div
			className={cn('w-full', className, isHighlighted && 'ring-2 ring-primary ring-offset-2')}
			id={`action-${action._id}`}
		>
			<ActionRow
				action={action}
				isExpanded={isExpanded}
				onToggle={() => setIsExpanded(!isExpanded)}
				isAuthorCurrentUser={isAuthorCurrentUser}
			/>
		</div>
	);
}
