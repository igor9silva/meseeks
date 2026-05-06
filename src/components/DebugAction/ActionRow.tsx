import type { Doc } from 'convex/_generated/dataModel';
import { asDollars } from 'lib/money';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Suspense, useState } from 'react';
import { toast } from 'sonner';
import { CopyButton } from '~/components/CopyButton';
import { Loading } from '~/components/Loading';
import { Button } from '~/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { cn } from '~/lib/utils';
import { ActionDetailsContent } from './ActionDetailsContent';
import { CostSection } from './ActionCostSection';
import { ArgumentsSection, ResultSection } from './ActionPayloadSections';
import { AuthorSection, AuthorizationSection, LifecycleSection } from './ActionMetadata';
import { copyToClipboard, formatLocalTimestamp, getStatusDot, serializeActionToJSON } from './utils';

export function ActionRow({
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
	const [actionDetails, setActionDetails] = useState<Doc<'action_details'> | null>(null);
	const maxCost = action.maxCost ?? action.estimatedCost;
	const totalActualCost = totalActualCostFor({ action, maxCost });

	const handleDataLoaded = (data: Doc<'action_details'>) => {
		//
		setActionDetails(data);
	};

	return (
		<TooltipProvider>
			<div className="border-b">
				<div
					className={cn(
						'flex items-center py-2 hover:bg-muted/50 cursor-pointer group',
						!isAuthorCurrentUser && 'border-l-4 border-l-blue-500 bg-blue-50/30 dark:bg-blue-950/20',
					)}
					style={{ paddingLeft: `${16 + action.depth * 4}px` }}
					onClick={onToggle}
				>
					<div className="flex items-center gap-2 min-w-0 flex-1">
						<Button variant="ghost" size="sm" className="h-4 w-4 p-0 opacity-60">
							{isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
						</Button>

						<div className={`w-2 h-2 rounded-full ${statusDot}`} />

						<ActionIdentity action={action} />
					</div>

					<ActionMeta
						action={action}
						actionDetails={actionDetails}
						maxCost={maxCost}
						totalActualCost={totalActualCost}
					/>
				</div>

				{isExpanded && (
					<div className="bg-muted/30 border-t">
						<div className="p-4 space-y-4">
							<AuthorSection action={action} isAuthorCurrentUser={isAuthorCurrentUser} />
							<AuthorizationSection action={action} isAuthorCurrentUser={isAuthorCurrentUser} />
							<LifecycleSection action={action} />

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

function ActionIdentity({ action }: { action: Doc<'actions'> }) {
	//
	return (
		<div className="min-w-0 flex-1">
			<div className="flex items-center gap-0.5 font-mono">
				<span className="text-sm">{action.skillKey} </span>
				<span className="text-muted-foreground text-xs">({action.depth})</span>
			</div>
			<div className="flex items-center gap-2">
				<code
					className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
					onClick={(event) => {
						event.stopPropagation();
						copyToClipboard(action._id);
						toast.success('Copied action ID to clipboard');
					}}
					title="Click to copy ID"
				>
					{action._id}
				</code>
				<div className="flex-1" />
			</div>
		</div>
	);
}

function ActionMeta({
	action,
	actionDetails,
	maxCost,
	totalActualCost,
}: {
	action: Doc<'actions'>;
	actionDetails: Doc<'action_details'> | null;
	maxCost: bigint | undefined;
	totalActualCost: bigint;
}) {
	//
	return (
		<div className="flex items-center gap-4 text-sm text-muted-foreground">
			<Tooltip>
				<TooltipTrigger asChild>
					<span
						className="hover:text-foreground cursor-pointer"
						onClick={(event) => {
							event.stopPropagation();
							copyToClipboard(new Date(action._creationTime).toISOString());
						}}
					>
						{formatLocalTimestamp(action._creationTime)}
					</span>
				</TooltipTrigger>
				<TooltipContent side="top" className="max-w-sm">
					<div className="space-y-1">
						<div className="font-mono text-xs">{new Date(action._creationTime).toISOString()}</div>
						<div className="text-xs">{formatLocalTimestamp(action._creationTime)}</div>
					</div>
				</TooltipContent>
			</Tooltip>

			<ActionCost maxCost={maxCost} totalActualCost={totalActualCost} />

			<CopyButton
				textToCopy={serializeActionToJSON(action, actionDetails)}
				tooltipText="Copy as JSON"
				className="opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity"
			/>
		</div>
	);
}

function ActionCost({ maxCost, totalActualCost }: { maxCost: bigint | undefined; totalActualCost: bigint }) {
	//
	return (
		<div className="text-right min-w-20">
			<Tooltip>
				<TooltipTrigger asChild>
					<div className="text-xs font-mono cursor-pointer hover:text-foreground">
						${asDollars({ bigInt: totalActualCost, precision: 6 })}
					</div>
				</TooltipTrigger>
				<TooltipContent side="top">
					<div className="space-y-1 text-xs">
						{typeof maxCost === 'bigint' && maxCost > 0n && (
							<div>Max: ${asDollars({ bigInt: maxCost, precision: 6 })}</div>
						)}
						<div>Actual: ${asDollars({ bigInt: totalActualCost, precision: 6 })}</div>
					</div>
				</TooltipContent>
			</Tooltip>
		</div>
	);
}

function totalActualCostFor({ action, maxCost }: { action: Doc<'actions'>; maxCost: bigint | undefined }) {
	//
	const isResolvedAction = action.status === 'succeeded' || action.status === 'skipped' || action.status === 'failed';
	const costs = 'costs' in action ? action.costs : undefined;

	return isResolvedAction && costs && costs.length > 0
		? costs.reduce((sum, cost) => sum + cost.amount, 0n)
		: maxCost || 0n;
}
