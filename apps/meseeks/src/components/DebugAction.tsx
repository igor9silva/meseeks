import type { Doc, Id } from 'convex/_generated/dataModel';
import { asDollars } from 'lib/money';
import { Bug, ChevronDown, ChevronRight, Eye } from 'lucide-react';
import { Suspense, type KeyboardEvent, type MouseEvent, type ReactNode, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Action } from '~/components/Action';
import { CopyButton } from '~/components/CopyButton';
import { Loading } from '~/components/Loading';
import { TimeAgo } from '~/components/TimeAgo';
import { useActionDetails } from '~/hooks/query/useActionDetails';
import { Badge } from '@pro/ui/badge';
import { Button } from '@pro/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@pro/ui/tooltip';
import { cn } from '@pro/ui/lib/utils';

type ActionDocument = Doc<'actions'>;
type ActionDetailsDocument = Doc<'action_details'>;

const statusDotClasses: Record<ActionDocument['status'], string> = {
	'pending authorization': 'bg-yellow-500',
	'enqueued': 'bg-slate-400',
	'running': 'bg-blue-500',
	'succeeded': 'bg-green-500',
	'failed': 'bg-red-500',
	'skipped': 'bg-muted-foreground',
	'interrupted': 'bg-orange-500',
};

export function DebugAction({
	className,
	action,
	initialRenderDate,
	isAuthorCurrentUser,
	suppressAnchorId,
	fileId,
}: {
	className?: string;
	action: ActionDocument;
	initialRenderDate: Date;
	isAuthorCurrentUser: boolean;
	suppressAnchorId?: boolean;
	fileId: Id<'files'>;
}) {
	//
	const [isExpanded, setIsExpanded] = useState(false);
	const [isHighlighted, setIsHighlighted] = useState(false);
	const [isShowingAction, setIsShowingAction] = useState(false);

	useEffect(() => {
		//
		const checkHash = () => {
			const shouldHighlight = window.location.hash === `#action-${action._id}`;
			setIsHighlighted(shouldHighlight);
			if (shouldHighlight) setIsExpanded(true);
		};

		checkHash();
		window.addEventListener('hashchange', checkHash);

		return () => window.removeEventListener('hashchange', checkHash);
	}, [action._id]);

	if (isShowingAction) {
		return (
			<div
				id={suppressAnchorId ? undefined : `action-${action._id}`}
				className={cn(
					'w-full border-b bg-background/60 p-2',
					className,
					isHighlighted && 'ring-2 ring-primary ring-offset-2',
				)}
			>
				<div className="mb-2 flex justify-end">
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="size-7 p-0 opacity-60 hover:opacity-100"
									aria-label="Show debug row"
									title="Show debug row"
									onClick={() => setIsShowingAction(false)}
								>
									<Bug className="size-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent className="px-2 py-1 text-xs">Show debug row</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>
				<Action
					action={action}
					initialRenderDate={initialRenderDate}
					isAuthorCurrentUser={isAuthorCurrentUser}
					suppressAnchorId
					fileId={fileId}
				/>
			</div>
		);
	}

	return (
		<div
			id={suppressAnchorId ? undefined : `action-${action._id}`}
			className={cn('w-full', className, isHighlighted && 'ring-2 ring-primary ring-offset-2')}
		>
			<ActionRow
				action={action}
				isExpanded={isExpanded}
				onToggle={() => setIsExpanded((open) => !open)}
				onShowAction={() => setIsShowingAction(true)}
				isAuthorCurrentUser={isAuthorCurrentUser}
				initialRenderDate={initialRenderDate}
			/>
		</div>
	);
}

function ActionRow({
	action,
	isExpanded,
	onToggle,
	onShowAction,
	isAuthorCurrentUser,
	initialRenderDate,
}: {
	action: ActionDocument;
	isExpanded: boolean;
	onToggle: () => void;
	onShowAction: () => void;
	isAuthorCurrentUser: boolean;
	initialRenderDate: Date;
}) {
	//
	const isNew = new Date(action._creationTime) > initialRenderDate;
	const costTotal = totalCost(action);
	const [details, setDetails] = useState<ActionDetailsDocument | null>(null);

	const handleRowKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		event.preventDefault();
		onToggle();
	};

	return (
		<TooltipProvider>
			<div
				className={cn(
					'border-b bg-background font-mono text-xs',
					isNew && 'animate-in fade-in duration-100',
					!isAuthorCurrentUser && 'border-l-4 border-l-blue-500 bg-blue-50/30 dark:bg-blue-950/20',
				)}
			>
				<div
					// this row owns nested copy/show buttons, so a native button would create invalid nested buttons.
					// oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
					role="button"
					tabIndex={0}
					aria-expanded={isExpanded}
					aria-label={`${isExpanded ? 'Collapse' : 'Expand'} debug details for ${action.skillKey} action ${action.index}`}
					className="group flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/50"
					style={{ paddingLeft: `${12 + action.depth * 6}px` }}
					onClick={onToggle}
					onKeyDown={handleRowKeyDown}
				>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="size-6 p-0 opacity-70"
						aria-label={`${isExpanded ? 'Collapse' : 'Expand'} debug details`}
						title={`${isExpanded ? 'Collapse' : 'Expand'} debug details`}
						onClick={(event) => {
							event.stopPropagation();
							onToggle();
						}}
					>
						{isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
					</Button>

					<div
						className={cn('size-2 shrink-0 rounded-full blur-[0.5px]', statusDotClasses[action.status])}
						aria-label={action.status}
					/>

					<div className="min-w-0 flex-1">
						<div className="flex flex-wrap items-center gap-1.5">
							<span className="text-sm font-semibold">{action.skillKey}()</span>
							<span className="text-muted-foreground">#{action.index}</span>
							<span className="text-muted-foreground">depth {action.depth}</span>
							<Badge variant={statusVariant(action.status)} className="font-sans text-[0.65rem]">
								{action.status}
							</Badge>
							{action.loopKey && (
								<Badge variant="outline" className="font-sans text-[0.65rem]">
									{action.loopKey}
								</Badge>
							)}
							{action.interruptedAt && (
								<Badge variant="destructive" className="font-sans text-[0.65rem]">
									interrupted
								</Badge>
							)}
						</div>
						<div className="mt-0.5 flex min-w-0 items-center gap-2">
							<CopyTextButton value={action._id} label="action id" className="truncate" />
							<span className="text-muted-foreground">
								<TimeAgo date={action.createdAt} />
							</span>
						</div>
					</div>

					<div className="hidden items-center gap-3 text-muted-foreground sm:flex">
						{action.maxCost !== undefined && (
							<CostBadge label="max" value={action.maxCost} tooltip="Reserved spending limit" />
						)}
						{action.reservedBudget !== undefined && (
							<CostBadge label="reserved" value={action.reservedBudget} tooltip="Reserved file budget" />
						)}
						<CostBadge label="cost" value={costTotal} tooltip="Settled cost" />
					</div>

					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="size-7 p-0 opacity-60 transition-opacity hover:opacity-100"
								aria-label="Show actual action"
								title="Show actual action"
								onClick={(event) => {
									event.stopPropagation();
									onShowAction();
								}}
							>
								<Eye className="size-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent className="px-2 py-1 text-xs">Show actual action</TooltipContent>
					</Tooltip>

					<CopyButton
						textToCopy={stringify(actionExport(action, details))}
						tooltipText="Copy action and details JSON"
						className="opacity-0 transition-opacity group-hover:opacity-60 hover:opacity-100"
					/>
				</div>

				{isExpanded && (
					<ExpandedAction
						action={action}
						isAuthorCurrentUser={isAuthorCurrentUser}
						onDetailsLoaded={setDetails}
					/>
				)}
			</div>
		</TooltipProvider>
	);
}

function ExpandedAction({
	action,
	isAuthorCurrentUser,
	onDetailsLoaded,
}: {
	action: ActionDocument;
	isAuthorCurrentUser: boolean;
	onDetailsLoaded: (details: ActionDetailsDocument | null) => void;
}) {
	//
	return (
		<div className="space-y-4 border-t bg-muted/30 p-4 font-sans text-sm">
			<CausalitySection action={action} isAuthorCurrentUser={isAuthorCurrentUser} />
			<LifecycleSection action={action} />
			<ArgumentsSection args={action.args} />
			<ResultSection result={action.result} />
			<PatchSection patch={action.patch} />
			<CostsSection action={action} />
			<ActionSelectionSection action={action} />
			<Suspense fallback={<Loading className="h-24" text="Loading action details..." />}>
				<ActionDetailsSection actionId={action._id} onDetailsLoaded={onDetailsLoaded} />
			</Suspense>
			<RawSection title="Raw action" value={action} defaultOpen={false} />
		</div>
	);
}

function DisclosureButton({
	isOpen,
	onClick,
	children,
	className,
}: {
	isOpen: boolean;
	onClick: () => void;
	children: ReactNode;
	className?: string;
}) {
	//
	return (
		<button
			type="button"
			className={cn(
				'mb-2 flex cursor-pointer items-baseline gap-2 bg-transparent p-0 text-left text-sm font-medium hover:text-blue-600 dark:hover:text-blue-400',
				className,
			)}
			onClick={onClick}
		>
			{isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
			{children}
		</button>
	);
}

function CausalitySection({ action, isAuthorCurrentUser }: { action: ActionDocument; isAuthorCurrentUser: boolean }) {
	//
	return (
		<div className="space-y-1 text-xs text-muted-foreground">
			<div>
				{isAuthorCurrentUser ? 'Authored by ' : 'Caused by '}
				<CopyTextButton value={action.author} label="author id">
					{isAuthorCurrentUser ? 'you' : action.author}
				</CopyTextButton>
				.
			</div>
			{action.spark && (
				<div>
					Spark{' '}
					<CopyTextButton value={action.spark} label="spark action id">
						{action.spark}
					</CopyTextButton>
					.
				</div>
			)}
		</div>
	);
}

function LifecycleSection({ action }: { action: ActionDocument }) {
	//
	const entries: Array<{ label: string; value: number }> = [];
	addLifecycleEntry(entries, { label: 'created', value: action.createdAt });
	addLifecycleEntry(entries, { label: 'authorized', value: action.authorizedAt });
	addLifecycleEntry(entries, { label: 'claimed', value: action.claimedAt });
	addLifecycleEntry(entries, { label: 'started', value: action.startedAt });
	addLifecycleEntry(entries, { label: 'settled', value: action.settledAt });
	addLifecycleEntry(entries, { label: 'interrupted', value: action.interruptedAt });

	if (entries.length === 0) return null;

	return (
		<div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-3">
			{entries.map((entry) => (
				<div key={entry.label} className="rounded-md border bg-background/80 p-2">
					<div className="text-muted-foreground">{entry.label}</div>
					<CopyTextButton value={new Date(entry.value).toISOString()} label={`${entry.label} timestamp`}>
						<TimeAgo date={entry.value} />
					</CopyTextButton>
				</div>
			))}
		</div>
	);
}

function ArgumentsSection({ args }: { args: ActionDocument['args'] }) {
	//
	const [isOpen, setIsOpen] = useState(false);
	const count = Object.keys(args).length;

	if (count === 0) return null;

	return (
		<div>
			<DisclosureButton isOpen={isOpen} onClick={() => setIsOpen(!isOpen)}>
				Arguments <span className="text-xs font-normal text-muted-foreground">({count})</span>
			</DisclosureButton>
			{isOpen && <StructuredBlock value={args} />}
		</div>
	);
}

function ResultSection({ result }: { result: ActionDocument['result'] }) {
	//
	const [isOpen, setIsOpen] = useState(false);
	if (!result) return null;

	const textLength = result.text?.length ?? 0;
	const files = result.files ?? [];
	const fileCount = files.length;
	const metadataCount = Object.keys(result.metadata ?? {}).length;

	return (
		<div>
			<DisclosureButton isOpen={isOpen} onClick={() => setIsOpen(!isOpen)}>
				Result{' '}
				<span className="text-xs font-normal text-muted-foreground">
					(
					{summaryParts([
						textLength > 0 ? `${textLength} chars` : undefined,
						fileCount > 0 ? `${fileCount} files` : undefined,
						metadataCount > 0 ? `${metadataCount} metadata keys` : undefined,
					])}
					)
				</span>
			</DisclosureButton>
			{isOpen && (
				<div className="space-y-3">
					{result.text && <TextareaBlock value={result.text} className="text-sm" />}
					{files.length > 0 && <StructuredBlock value={files} />}
					{result.metadata && <StructuredBlock value={result.metadata} />}
				</div>
			)}
		</div>
	);
}

function PatchSection({ patch }: { patch: ActionDocument['patch'] }) {
	//
	const [isOpen, setIsOpen] = useState(false);
	if (!patch) return null;

	return (
		<div>
			<DisclosureButton isOpen={isOpen} onClick={() => setIsOpen(!isOpen)}>
				Patch <span className="text-xs font-normal text-muted-foreground">({patch.length} chars)</span>
			</DisclosureButton>
			{isOpen && <TextareaBlock value={patch} className="font-mono text-xs" />}
		</div>
	);
}

function CostsSection({ action }: { action: ActionDocument }) {
	//
	const [isOpen, setIsOpen] = useState(false);
	const costs = action.costs ?? [];
	const hasEstimatedCost = action.expectedCost !== undefined || action.maxCost !== undefined;
	const hasActualCosts = costs.length > 0;
	if (!hasEstimatedCost && !hasActualCosts && action.reservedBudget === undefined) return null;

	const actualTotal = totalCost(action);

	return (
		<div>
			<DisclosureButton isOpen={isOpen} onClick={() => setIsOpen(!isOpen)}>
				Costs{' '}
				<span className="text-xs font-normal text-muted-foreground">
					(${asDollars({ bigInt: actualTotal, precision: 6 })})
				</span>
			</DisclosureButton>
			{isOpen && (
				<div className="space-y-3">
					<div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
						<MoneyCell label="expected" value={action.expectedCost} />
						<MoneyCell label="max" value={action.maxCost} />
						<MoneyCell label="reserved" value={action.reservedBudget} />
						<MoneyCell label="actual" value={actualTotal} />
					</div>
					{costs.length > 0 && <StructuredBlock value={costs} />}
				</div>
			)}
		</div>
	);
}

function ActionSelectionSection({ action }: { action: ActionDocument }) {
	//
	const [isOpen, setIsOpen] = useState(false);
	const value = {
		loop: action.loopKey,
		intelligence: action.intelligenceKey,
	};
	const count = [action.loopKey, action.intelligenceKey].filter(Boolean).length;
	if (count === 0) return null;

	return (
		<div>
			<DisclosureButton isOpen={isOpen} onClick={() => setIsOpen(!isOpen)}>
				Action selection{' '}
				<span className="text-xs font-normal text-muted-foreground">
					({count} entr{count === 1 ? 'y' : 'ies'})
				</span>
			</DisclosureButton>
			{isOpen && <StructuredBlock value={value} />}
		</div>
	);
}

function ActionDetailsSection({
	actionId,
	onDetailsLoaded,
}: {
	actionId: Id<'actions'>;
	onDetailsLoaded: (details: ActionDetailsDocument | null) => void;
}) {
	//
	const { actionDetails } = useActionDetails(actionId);
	const details = actionDetails?.details ?? null;

	useEffect(() => {
		//
		onDetailsLoaded(details);
	}, [details, onDetailsLoaded]);

	if (!details) {
		return (
			<div className="rounded-md border border-dashed bg-background/50 p-3 text-xs text-muted-foreground">
				No action details persisted yet.
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<ExecutionReceiptSection details={details} />
			<TextDetailsSection title="Instructions" value={details.instructions} />
			<StructuredDetailsSection title="Input" value={details.input} />
			<StructuredDetailsSection title="Output" value={details.output} />
			<StructuredDetailsSection title="Usage" value={details.usage} />
			<WarningsSection warnings={details.warnings} />
			<TextDetailsSection title="Details patch" value={details.patch} />
			<RawSection title="Raw details" value={details} defaultOpen={false} />
		</div>
	);
}

function ExecutionReceiptSection({ details }: { details: ActionDetailsDocument }) {
	//
	const receipt = {
		provider: details.provider,
		model: details.model,
		skill: details.skill,
		skillFile: details.skillFile,
		loop: details.loop,
		costs: details.costs?.length ?? 0,
		result: details.result ? 'present' : undefined,
	};

	return (
		<div>
			<div className="mb-2 text-sm font-medium">Execution details</div>
			<div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
				<DebugCell label="provider" value={receipt.provider} />
				<DebugCell label="model" value={receipt.model} />
				<DebugCell label="skill" value={receipt.skill} />
				<DebugCell label="skill file" value={receipt.skillFile} />
				<DebugCell label="loop" value={receipt.loop} />
				<DebugCell label="cost rows" value={String(receipt.costs)} />
				<DebugCell label="result" value={receipt.result} />
			</div>
		</div>
	);
}

function StructuredDetailsSection({ title, value }: { title: string; value: unknown }) {
	//
	const [isOpen, setIsOpen] = useState(false);
	if (value === undefined) return null;

	const text = stringify(value);

	return (
		<div>
			<DisclosureButton isOpen={isOpen} onClick={() => setIsOpen(!isOpen)}>
				{title} <span className="text-xs font-normal text-muted-foreground">({text.length} chars)</span>
			</DisclosureButton>
			{isOpen && <StructuredBlock value={value} />}
		</div>
	);
}

function TextDetailsSection({ title, value }: { title: string; value: string | undefined }) {
	//
	const [isOpen, setIsOpen] = useState(false);
	if (!value) return null;

	return (
		<div>
			<DisclosureButton isOpen={isOpen} onClick={() => setIsOpen(!isOpen)}>
				{title} <span className="text-xs font-normal text-muted-foreground">({value.length} chars)</span>
			</DisclosureButton>
			{isOpen && <TextareaBlock value={value} className="text-sm" />}
		</div>
	);
}

function WarningsSection({ warnings }: { warnings: ActionDetailsDocument['warnings'] }) {
	//
	const [isOpen, setIsOpen] = useState(false);
	if (!warnings || warnings.length === 0) return null;

	return (
		<div>
			<DisclosureButton isOpen={isOpen} onClick={() => setIsOpen(!isOpen)}>
				Warnings <span className="text-xs font-normal text-muted-foreground">({warnings.length})</span>
			</DisclosureButton>
			{isOpen && <StructuredBlock value={warnings} />}
		</div>
	);
}

function RawSection({ title, value, defaultOpen }: { title: string; value: unknown; defaultOpen: boolean }) {
	//
	const [isOpen, setIsOpen] = useState(defaultOpen);
	const text = stringify(value);

	return (
		<div>
			<DisclosureButton isOpen={isOpen} onClick={() => setIsOpen(!isOpen)}>
				{title} <span className="text-xs font-normal text-muted-foreground">({text.length} chars)</span>
			</DisclosureButton>
			{isOpen && <TextareaBlock value={text} className="font-mono text-xs" />}
		</div>
	);
}

function MoneyCell({ label, value }: { label: string; value: bigint | undefined }) {
	//
	return (
		<DebugCell
			label={label}
			value={value === undefined ? undefined : `$${asDollars({ bigInt: value, precision: 6 })}`}
		/>
	);
}

function DebugCell({ label, value }: { label: string; value: string | undefined }) {
	//
	return (
		<div className="min-w-0 rounded-md border bg-background/80 p-2">
			<div className="truncate text-muted-foreground">{label}</div>
			<div className="truncate font-mono">{value ?? 'n/a'}</div>
		</div>
	);
}

function CostBadge({ label, value, tooltip }: { label: string; value: bigint; tooltip: string }) {
	//
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<div className="min-w-20 text-right font-mono text-xs">
					<span className="text-muted-foreground">{label}</span> ${asDollars({ bigInt: value, precision: 6 })}
				</div>
			</TooltipTrigger>
			<TooltipContent className="px-2 py-1 text-xs">{tooltip}</TooltipContent>
		</Tooltip>
	);
}

function CopyTextButton({
	value,
	label,
	children,
	className,
}: {
	value: string;
	label: string;
	children?: ReactNode;
	className?: string;
}) {
	//
	const handleClick = async (event: MouseEvent<HTMLButtonElement>) => {
		event.stopPropagation();
		await navigator.clipboard.writeText(value);
		const target = document.getElementById(`action-${value}`);
		if (target) {
			target.scrollIntoView({ behavior: 'smooth', block: 'center' });
			window.location.hash = `action-${value}`;
		}
		toast.success(`Copied ${label}`);
	};

	return (
		<button
			type="button"
			className={cn('font-mono underline-offset-2 hover:text-foreground hover:underline', className)}
			aria-label={`Copy ${label}`}
			onClick={handleClick}
			title={`Copy ${label}`}
		>
			{children ?? value}
		</button>
	);
}

function StructuredBlock({ value }: { value: unknown }) {
	//
	return (
		<pre className="max-h-96 overflow-auto rounded-lg border bg-background/80 p-3 font-mono text-xs whitespace-pre-wrap break-words">
			{stringify(value)}
		</pre>
	);
}

function TextareaBlock({ value, className }: { value: string; className?: string }) {
	//
	return (
		<textarea
			value={value}
			readOnly
			className={cn(
				'w-full min-h-32 max-h-[48rem] resize-y rounded-lg border bg-background/80 p-3 whitespace-pre-wrap',
				className,
			)}
		/>
	);
}

function statusVariant(status: ActionDocument['status']) {
	//
	if (status === 'failed') return 'destructive';
	if (status === 'succeeded') return 'secondary';
	if (status === 'running') return 'default';

	return 'outline';
}

function totalCost(action: ActionDocument) {
	//
	const costs = action.costs ?? [];
	return costs.reduce((total, cost) => total + cost.amount, 0n);
}

function addLifecycleEntry(
	entries: Array<{ label: string; value: number }>,
	entry: { label: string; value: number | undefined },
) {
	//
	if (entry.value === undefined) return;
	entries.push({ label: entry.label, value: entry.value });
}

function summaryParts(parts: Array<string | undefined>) {
	//
	const values = parts.filter((part) => part && part.trim());
	if (values.length === 0) return 'none';

	return values.join(', ');
}

function actionExport(action: ActionDocument, details: ActionDetailsDocument | null) {
	//
	return {
		action,
		details,
	};
}

function stringify(value: unknown) {
	//
	return (
		JSON.stringify(
			value,
			(_key: string, item: unknown) => {
				if (typeof item === 'bigint') return asDollars({ bigInt: item, precision: 6 });
				return item;
			},
			2,
		) ?? ''
	);
}
