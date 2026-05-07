import type { Doc } from 'convex/_generated/dataModel';
import { asDollars } from 'lib/money';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CopyButton } from '~/components/CopyButton';
import { Loading } from '~/components/Loading';
import { TimeAgo } from '~/components/TimeAgo';
import { Badge } from '@reactor/ui/badge';
import { Button } from '@reactor/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@reactor/ui/tooltip';
import { useActionDetails } from '~/hooks/query/useActionDetails';
import { cn } from '@reactor/ui/lib/utils';

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

function DisclosureButton({
	isOpen,
	onClick,
	children,
	className,
}: {
	isOpen: boolean;
	onClick: () => void;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<button
			type="button"
			className={cn(
				'flex items-baseline gap-2 text-sm font-medium mb-2 cursor-pointer bg-transparent p-0 text-left hover:text-blue-600 dark:hover:text-blue-400',
				className,
			)}
			onClick={onClick}
		>
			{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
			{children}
		</button>
	);
}

// Approval display component
function ApprovalSection({ action }: { action: Doc<'actions'> }) {
	//
	const hasApprovalInfo = action.approvedAt || action.approvedBy;

	if (!hasApprovalInfo) return null;
	// if (action.status === 'skipped') return null;

	const handleApprovedAtClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (action.approvedAt) {
			copyToClipboard(new Date(action.approvedAt).toISOString());
			toast.success('Copied approval timestamp to clipboard');
		}
	};

	const handleApprovedByClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (action.approvedBy && action.approvedBy !== 'auto') {
			copyToClipboard(action.approvedBy);
			toast.success('Copied approver ID to clipboard');
		}
	};

	const getApprovalStatusText = () => {
		return 'Approved';
	};

	const isApprovedByCurrentUser = action.approvedBy === action.owner;
	const isAutoApproval = action.approvedBy === 'auto';
	const isClickable = action.approvedBy && !isAutoApproval;

	return (
		<div className="text-xs text-muted-foreground">
			{getApprovalStatusText()}{' '}
			{action.approvedBy && (
				<>
					{isAutoApproval ? (
						<span>automatically</span>
					) : (
						<button
							type="button"
							className="font-mono hover:text-foreground cursor-pointer underline-offset-2 hover:underline"
							onClick={isClickable ? handleApprovedByClick : undefined}
						>
							by {isApprovedByCurrentUser ? 'you' : action.approvedBy}
						</button>
					)}
					{action.approvedAt && ' '}
				</>
			)}
			{action.approvedAt && (
				<Tooltip>
					<TooltipTrigger asChild>
						<button
							type="button"
							className="hover:text-foreground cursor-pointer underline-offset-2 hover:underline"
							onClick={handleApprovedAtClick}
						>
							<TimeAgo date={action.approvedAt} />
						</button>
					</TooltipTrigger>
					<TooltipContent side="top" className="max-w-sm">
						<div className="space-y-1">
							<div className="font-mono text-xs">{new Date(action.approvedAt).toISOString()}</div>
							<div className="text-xs">{formatLocalDate(action.approvedAt)}</div>
						</div>
					</TooltipContent>
				</Tooltip>
			)}
			.
		</div>
	);
}

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

	// Get status-specific text
	const getStatusText = () => {
		if (isAuthorCurrentUser) {
			switch (action.status) {
				case 'succeeded':
					return 'Performed by';
				case 'skipped':
					return 'Scheduled by';
				case 'failed':
					return 'Attempted to perform by';
				case 'running':
					return 'Performing by';
				default:
					return 'Performed by';
			}
		} else {
			switch (action.status) {
				case 'succeeded':
					return 'Performed as a reaction from';
				case 'skipped':
					return 'Scheduled as a reaction from';
				case 'failed':
					return 'Attempted to perform as a reaction from';
				case 'running':
					return 'Performing as a reaction from';
				case 'pending authorization':
					return 'Pending authorization as a reaction from';
				default:
					return 'Performed as a reaction from';
			}
		}
	};

	return (
		<div className="text-xs text-muted-foreground">
			{getStatusText()}{' '}
			<button
				type="button"
				className="font-mono hover:text-foreground cursor-pointer underline-offset-2 hover:underline"
				onClick={handleClick}
			>
				{isAuthorCurrentUser ? 'you' : action.author}
			</button>
			{action.status === 'skipped' ? ', but skipped.' : '.'}
		</div>
	);
}

function ArgumentsSection({ args }: { args: Record<string, unknown> }) {
	//
	const [isOpen, setIsOpen] = useState(false);

	if (!args || Object.keys(args).length === 0) return null;

	return (
		<div>
			<DisclosureButton isOpen={isOpen} onClick={() => setIsOpen(!isOpen)}>
				Arguments
				<span className="text-muted-foreground font-normal text-xs">({Object.keys(args).length})</span>
			</DisclosureButton>
			{isOpen && (
				<div className="bg-muted border rounded-lg p-3 text-sm space-y-1 max-h-48 overflow-auto resize-y">
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

function ReactionItem({ reaction }: { reaction: any }) {
	//
	const [isOpen, setIsOpen] = useState(false);
	const argCount = reaction.args ? Object.keys(reaction.args).length : 0;

	// Format argument count text
	const getArgumentText = (count: number) => {
		return count === 1 ? `${count} argument` : `${count} arguments`;
	};

	return (
		<div className="ml-4">
			<DisclosureButton isOpen={isOpen} onClick={() => setIsOpen(!isOpen)}>
				{reaction.skillKey}
				<span className="text-muted-foreground font-normal text-xs">({getArgumentText(argCount)})</span>
			</DisclosureButton>
			{isOpen &&
				(argCount > 0 ? (
					<div className="bg-muted border rounded-lg p-3 text-sm space-y-1 max-h-48 overflow-auto resize-y">
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
					<div className="bg-muted border rounded-lg p-3 text-sm text-muted-foreground italic">
						No arguments
					</div>
				))}
		</div>
	);
}

function ResultSection({ result }: { result: Doc<'actions'>['result'] }) {
	//
	const [isOpen, setIsOpen] = useState(false);

	if (!result) return null;
	const hasText = Boolean(result.text);
	const hasReactions = Boolean(result.reactions && result.reactions.length > 0);

	// If neither text nor reactions, fallback to JSON
	if (!hasText && !hasReactions) {
		const jsonString = JSON.stringify(result, null, 2);
		return (
			<div>
				<DisclosureButton isOpen={isOpen} onClick={() => setIsOpen(!isOpen)}>
					Result
					<span className="text-muted-foreground font-normal text-xs">({jsonString.length} characters)</span>
				</DisclosureButton>
				{isOpen && (
					<textarea
						value={jsonString}
						readOnly
						className="w-full min-h-32 max-h-[48rem] p-3 text-xs bg-muted border rounded-lg resize-y whitespace-pre-wrap font-mono"
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
			<DisclosureButton isOpen={isOpen} onClick={() => setIsOpen(!isOpen)}>
				Result
				<span className="text-muted-foreground font-normal text-xs">{summary}</span>
			</DisclosureButton>
			{isOpen && (
				<div className="space-y-3">
					{/* Text block - no labels, no container, just the text */}
					{hasText && (
						<textarea
							value={result.text!}
							readOnly
							className="w-full min-h-32 max-h-[48rem] p-3 text-sm bg-muted border rounded-lg resize-y whitespace-pre-wrap"
							style={{ fontFamily: 'inherit' }}
						/>
					)}

					{/* Reactions as individual collapsible blocks */}
					{hasReactions && (
						<div className="space-y-2">
							{result.reactions!.map((reaction, index) => (
								<ReactionItem key={index} reaction={reaction} />
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}

function CostSection({ action }: { action: Doc<'actions'> }) {
	//
	const [isOpen, setIsOpen] = useState(false);
	const hasEstimatedCost = typeof action.estimatedCost === 'bigint';
	const hasActualCosts = 'costs' in action && action.costs && action.costs.length > 0;

	if (!hasEstimatedCost && !hasActualCosts) return null;
	const estimatedAmount = hasEstimatedCost ? action.estimatedCost! : 0n;
	const actualTotal = hasActualCosts ? action.costs.reduce((total, cost) => total + cost.amount, 0n) : 0n;

	return (
		<div className="space-y-3">
			{hasActualCosts && (
				<div>
					<DisclosureButton isOpen={isOpen} onClick={() => setIsOpen(!isOpen)}>
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
					</DisclosureButton>
					{isOpen && (
						<div className="bg-muted border rounded-lg p-3 space-y-1 text-sm">
							{action.costs.map((cost, index) => (
								<div key={index} className="flex justify-between">
									<span>{cost.description}</span>
									<span className="font-mono">
										${asDollars({ bigInt: cost.amount, precision: 6 })} energy
									</span>
								</div>
							))}
						</div>
					)}
				</div>
			)}

			{hasEstimatedCost && !hasActualCosts && (
				<div>
					<DisclosureButton isOpen={isOpen} onClick={() => setIsOpen(!isOpen)}>
						Estimated Cost
						<span className="text-muted-foreground font-normal text-xs">
							(${asDollars({ bigInt: action.estimatedCost!, precision: 6 })})
						</span>
					</DisclosureButton>
					{isOpen && (
						<div className="bg-muted border rounded-lg p-3 text-sm">
							<div className="flex justify-between">
								<span>Estimated:</span>
								<span className="font-mono">
									${asDollars({ bigInt: action.estimatedCost!, precision: 6 })} energy
								</span>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

function MessageHistoryItem({
	message, //
	index,
}: {
	message: { role: string; content: string };
	index: number;
}) {
	//
	const [isOpen, setIsOpen] = useState(false);

	const getRoleColor = (role: string) => {
		switch (role) {
			case 'system':
				return 'text-red-600 dark:text-red-400';
			case 'user':
				return 'text-blue-600 dark:text-blue-400';
			case 'assistant':
				return 'text-green-600 dark:text-green-400';
			case 'tool':
				return 'text-purple-600 dark:text-purple-400';
			case 'function':
				return 'text-orange-600 dark:text-orange-400';
			default:
				return 'text-gray-600 dark:text-gray-400';
		}
	};

	const getRoleIcon = (role: string) => {
		switch (role) {
			case 'system':
				return '🔧';
			case 'user':
				return '👤';
			case 'assistant':
				return '🤖';
			case 'tool':
				return '🔨';
			case 'function':
				return '⚙️';
			default:
				return '💬';
		}
	};

	return (
		<div className="border rounded-3xl p-3 bg-card">
			<DisclosureButton
				isOpen={isOpen}
				onClick={() => setIsOpen(!isOpen)}
				className="items-center hover:bg-muted/50 rounded-lg p-2 -m-2"
			>
				<span className="text-xs font-mono text-muted-foreground">#{index + 1}</span>
				<span className={`text-sm font-medium ${getRoleColor(message.role)}`}>
					{getRoleIcon(message.role)} {message.role}
				</span>
				<div className="flex-1" />
				<span className="text-xs text-muted-foreground">
					{/* TODO: use env var CHAR_PER_TOKEN (currently server only) */}
					{message.content.length} chars (~{Math.ceil(message.content.length / 3.5)} tokens)
				</span>
			</DisclosureButton>

			{isOpen && (
				<div className="mt-3 pt-3 border-t">
					<textarea
						value={message.content}
						readOnly
						className="w-full min-h-24 max-h-64 p-3 text-sm bg-muted border rounded resize-y whitespace-pre-wrap"
						style={{ fontFamily: 'inherit' }}
					/>
				</div>
			)}
		</div>
	);
}

function MessageHistorySection({
	messages, //
}: {
	messages: Array<{ role: string; content: string }>;
}) {
	const [isOpen, setIsOpen] = useState(false);

	if (!messages || messages.length === 0) {
		return (
			<div>
				<div className="text-sm font-medium mb-2">History</div>
				<div className="text-muted-foreground text-sm italic">No conversation history</div>
			</div>
		);
	}

	return (
		<div>
			<DisclosureButton isOpen={isOpen} onClick={() => setIsOpen(!isOpen)}>
				History
				<span className="text-muted-foreground font-normal text-xs">({messages.length} messages)</span>
			</DisclosureButton>

			{isOpen && (
				<div className="space-y-3">
					{messages.map((message, index) => (
						<MessageHistoryItem key={index} message={message} index={index} />
					))}
				</div>
			)}
		</div>
	);
}

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
						{llm.finishReason || 'N/A'}
					</div>
				</div>
				{llm.usage && (
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
				)}
			</div>

			<MessageHistorySection messages={llm.history} />

			{llm.availableTools && llm.availableTools.length > 0 && (
				<div>
					<div className="text-sm font-medium mb-2">Available Skills</div>
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
					<div className="flex items-baseline justify-between text-sm font-medium mb-2">
						<div>System Instructions</div>
						<span className="text-muted-foreground font-normal text-xs">
							{/* TODO: use env var CHAR_PER_TOKEN (currently server only) */}(
							{llm.systemInstructions.length} chars ~{Math.ceil(llm.systemInstructions.length / 3.5)}{' '}
							tokens)
						</span>
					</div>
					<textarea
						value={llm.systemInstructions}
						readOnly
						className="w-full min-h-32 max-h-[48rem] p-3 text-sm bg-muted border rounded resize-y whitespace-pre-wrap"
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
						className="w-full min-h-32 max-h-[48rem] p-3 text-xs bg-muted border rounded-lg resize-y whitespace-pre-wrap font-mono"
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
						className="w-full min-h-32 max-h-[48rem] p-3 text-sm bg-muted border rounded resize-y whitespace-pre-wrap"
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
	const [searchParamsOpen, setSearchParamsOpen] = useState(false);
	const [responseBodyOpen, setResponseBodyOpen] = useState(false);
	const [responseHeadersOpen, setResponseHeadersOpen] = useState(false);

	if (!actionDetails.http) return null;

	const http = actionDetails.http;

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
					<DisclosureButton
						isOpen={searchParamsOpen}
						onClick={() => setSearchParamsOpen(!searchParamsOpen)}
						className="items-center"
					>
						Search Parameters
						<span className="text-muted-foreground font-normal text-xs">
							({Object.keys(searchParams).length} parameters)
						</span>
					</DisclosureButton>
					{searchParamsOpen && (
						<div className="bg-muted border rounded-lg p-3 text-sm space-y-1 max-h-48 overflow-auto resize-y">
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
					<DisclosureButton
						isOpen={responseBodyOpen}
						onClick={() => setResponseBodyOpen(!responseBodyOpen)}
						className="items-center"
					>
						Response Body
						{http.responseBodySize && (
							<span className="text-muted-foreground font-normal text-xs">
								({http.responseBodySize} bytes)
							</span>
						)}
					</DisclosureButton>
					{responseBodyOpen && (
						<textarea
							value={http.responseBody}
							readOnly
							className="w-full min-h-32 max-h-[48rem] p-3 text-xs bg-muted border rounded-lg resize-y whitespace-pre-wrap font-mono"
							style={{ fontFamily: 'ui-monospace, monospace' }}
						/>
					)}
				</div>
			)}

			{http.responseHeaders && Object.keys(http.responseHeaders).length > 0 && (
				<div>
					<DisclosureButton
						isOpen={responseHeadersOpen}
						onClick={() => setResponseHeadersOpen(!responseHeadersOpen)}
						className="items-center"
					>
						Response Headers
						<span className="text-muted-foreground font-normal text-xs">
							({Object.keys(http.responseHeaders).length} headers)
						</span>
					</DisclosureButton>
					{responseHeadersOpen && (
						<div className="bg-muted border rounded-lg p-3 text-sm space-y-1 max-h-48 overflow-auto resize-y">
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
function ActionDetailsContent({
	action,
	onDataLoaded,
}: {
	action: Doc<'actions'>;
	onDataLoaded?: (data: any) => void;
}) {
	//
	const { actionDetails } = useActionDetails(action._id);

	useEffect(() => {
		//
		if (actionDetails && onDataLoaded) {
			onDataLoaded(actionDetails);
		}
	}, [actionDetails, onDataLoaded]);

	if (!actionDetails) return null;

	return (
		<>
			{actionDetails.skillKind === 'soft' && <LlmDetailsSection actionDetails={actionDetails} />}
			{actionDetails.skillKind === 'hard' && <HttpDetailsSection actionDetails={actionDetails} />}
		</>
	);
}

// Serialize action and details to JSON
const serializeActionToJSON = (action: Doc<'actions'>, actionDetails?: any) => {
	//
	const serializable = {
		...action,
		// Convert bigint values to strings for JSON serialization
		estimatedCost: action.estimatedCost ? action.estimatedCost.toString() : null,
		costs:
			'costs' in action
				? (action as any).costs?.map((cost: any) => ({
						...cost,
						amount: cost.amount.toString(),
					}))
				: undefined,
		// Add action details if available
		details: actionDetails || null,
	};

	return JSON.stringify(serializable, null, 2);
};

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
	const [actionDetails, setActionDetails] = useState<any>(null);

	// Calculate total actual cost
	const isResolvedAction = action.status === 'succeeded' || action.status === 'skipped' || action.status === 'failed';
	const totalActualCost =
		isResolvedAction && 'costs' in action && (action as any).costs && (action as any).costs.length > 0
			? (action as any).costs.reduce((sum: bigint, cost: any) => sum + cost.amount, 0n)
			: action.estimatedCost || 0n;

	const handleDataLoaded = (data: any) => {
		//
		setActionDetails(data);
	};

	const handleRowKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		event.preventDefault();
		onToggle();
	};

	return (
		<TooltipProvider>
			<div className="border-b">
				{/* Main row */}
				<div
					// oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- this row contains nested copy controls, so making the whole row a native button would create invalid nested buttons
					role="button"
					tabIndex={0}
					className={cn(
						'flex items-center py-2 hover:bg-muted/50 cursor-pointer group',
						!isAuthorCurrentUser && 'border-l-4 border-l-blue-500 bg-blue-50/30 dark:bg-blue-950/20',
					)}
					style={{ paddingLeft: `${16 + action.depth * 4}px` }}
					onClick={onToggle}
					onKeyDown={handleRowKeyDown}
				>
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
							<div className="flex items-center gap-2">
								<button
									type="button"
									className="font-mono text-xs text-muted-foreground hover:text-foreground cursor-pointer"
									onClick={(e) => {
										e.stopPropagation();
										copyToClipboard(action._id);
										toast.success('Copied action ID to clipboard');
									}}
									title="Click to copy ID"
								>
									{action._id}
								</button>
								<div className="flex-1" />
							</div>
						</div>
					</div>

					<div className="flex items-center gap-4 text-sm text-muted-foreground">
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									className="hover:text-foreground cursor-pointer"
									onClick={(e) => {
										e.stopPropagation();
										copyToClipboard(new Date(action._creationTime).toISOString());
									}}
								>
									<TimeAgo date={action._creationTime} />
								</button>
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

						<CopyButton
							textToCopy={serializeActionToJSON(action, actionDetails)}
							tooltipText="Copy as JSON"
							className="opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity"
						/>
					</div>
				</div>

				{/* Expanded content */}
				{isExpanded && (
					<div className="bg-muted/30 border-t">
						<div className="p-4 space-y-4">
							<AuthorSection action={action} isAuthorCurrentUser={isAuthorCurrentUser} />
							<ApprovalSection action={action} />

							<ArgumentsSection args={action.args} />
							<ResultSection result={action.result} />
							<CostSection action={action} />

							<Suspense fallback={<Loading />}>
								<ActionDetailsContent action={action} onDataLoaded={handleDataLoaded} />
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
	isAuthorCurrentUser,
}: {
	className?: string;
	action: Doc<'actions'>;
	isAuthorCurrentUser: boolean;
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
				onToggle={() => {
					console.log('Toggle clicked, current state:', isExpanded);
					setIsExpanded(!isExpanded);
				}}
				isAuthorCurrentUser={isAuthorCurrentUser}
			/>
		</div>
	);
}
