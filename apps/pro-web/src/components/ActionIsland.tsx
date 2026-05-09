import { type Doc, type Id } from 'convex/_generated/dataModel';
import { usePaginatedQuery } from 'convex/react';
import { ChevronDown, Clock3, Loader2, ShieldAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { api } from 'convex/_generated/api';
import { useApproveAction, useRejectAction } from '~/hooks/useTaskMutations';
import { cn } from '@reactor/ui/lib/utils';
import { Button } from '@reactor/ui/button';
import { LoadingButton } from '@reactor/ui/loading-button';
import { Popover, PopoverContent, PopoverTrigger } from '@reactor/ui/popover';

const INITIAL_ACTION_COUNT = 20;

export function ActionIsland({
	taskId, //
	className,
}: {
	taskId: Id<'tasks'>;
	className?: string;
}) {
	//
	const [isOpen, setIsOpen] = useState(false);
	const { results } = usePaginatedQuery(
		api.action.findAllPaginated,
		{ taskId },
		{ initialNumItems: INITIAL_ACTION_COUNT },
	);

	const activeActions = useMemo(() => {
		return results.filter(isActiveAction).sort((a, b) => {
			const priorityDelta = getActionPriority(a.status) - getActionPriority(b.status);
			if (priorityDelta !== 0) return priorityDelta;

			return b._creationTime - a._creationTime;
		});
	}, [results]);

	if (activeActions.length === 0) return null;

	const summary = buildSummary(activeActions);
	const hasApprovalBlocker = activeActions.some((action) => action.status === 'blocked');

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="secondary"
					className={cn(
						'h-10 max-w-64 gap-2 overflow-hidden px-3',
						hasApprovalBlocker && 'ring-1 ring-amber-500/40',
						className,
					)}
					title={summary}
				>
					<SummaryIcon actions={activeActions} />
					<span className="hidden md:inline truncate text-sm">{summary}</span>
					<span className="rounded-full bg-background/70 px-2 py-0.5 text-xs leading-none">
						{activeActions.length}
					</span>
					<ChevronDown className={cn('size-4 shrink-0 transition-transform', isOpen && 'rotate-180')} />
				</Button>
			</PopoverTrigger>

			<PopoverContent align="end" className="w-96 overflow-hidden p-0">
				<div className="border-b px-4 py-3">
					<div className="text-sm font-medium">Active actions</div>
					<div className="text-xs text-muted-foreground">{summary}</div>
				</div>

				<div className="max-h-96 space-y-2 overflow-y-auto p-2">
					{activeActions.map((action) => (
						<ActiveActionCard key={action._id} action={action} taskId={taskId} />
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
}

function ActiveActionCard({ action, taskId }: { action: Doc<'actions'>; taskId: Id<'tasks'> }) {
	//
	const { approveAction, isApprovingAction } = useApproveAction();
	const { rejectAction, isRejectingAction } = useRejectAction();
	const preview = buildActionPreview(action);

	return (
		<div className="rounded-3xl border bg-background/60 p-3">
			<div className="flex items-start gap-3">
				<StatusDot status={action.status} />

				<div className="min-w-0 flex-1">
					<div className="truncate text-sm font-medium">
						<code>{action.skillKey}()</code>
					</div>
					<div className="text-xs text-muted-foreground">{getStatusLabel(action.status)}</div>
					{preview && <div className="mt-1 truncate text-xs text-muted-foreground">{preview}</div>}
				</div>
			</div>

			{action.status === 'blocked' && (
				<div className="mt-3 flex gap-2">
					<LoadingButton
						size="sm"
						onClick={() => approveAction({ taskId, actionId: action._id })}
						loading={isApprovingAction}
						loadingText="Authorizing..."
					>
						Authorize
					</LoadingButton>
					<LoadingButton
						size="sm"
						variant="destructive"
						onClick={() => rejectAction({ taskId, actionId: action._id })}
						loading={isRejectingAction}
						loadingText="Skipping..."
					>
						Skip
					</LoadingButton>
				</div>
			)}
		</div>
	);
}

function SummaryIcon({ actions }: { actions: Doc<'actions'>[] }) {
	//
	if (actions.some((action) => action.status === 'blocked')) {
		return <ShieldAlert className="size-4 text-amber-500" />;
	}

	if (actions.some((action) => action.status === 'running')) {
		return <Loader2 className="size-4 animate-spin" />;
	}

	return <Clock3 className="size-4" />;
}

function StatusDot({ status }: { status: Doc<'actions'>['status'] }) {
	//
	return (
		<span
			className={cn('mt-1.5 size-2 shrink-0 rounded-full', {
				'bg-amber-500': status === 'blocked',
				'bg-blue-500 animate-pulse': status === 'running',
				'bg-muted-foreground': status === 'enqueued',
			})}
		/>
	);
}

function isActiveAction(action: Doc<'actions'>) {
	//
	return action.status === 'blocked' || action.status === 'running' || action.status === 'enqueued';
}

function getActionPriority(status: Doc<'actions'>['status']) {
	//
	if (status === 'blocked') return 0;
	if (status === 'running') return 1;
	if (status === 'enqueued') return 2;
	return 3;
}

function buildSummary(actions: Doc<'actions'>[]) {
	//
	const pendingAuthorizationCount = actions.filter((action) => action.status === 'blocked').length;
	const runningCount = actions.filter((action) => action.status === 'running').length;
	const enqueuedCount = actions.filter((action) => action.status === 'enqueued').length;

	if (pendingAuthorizationCount > 0) {
		const approvalsText =
			pendingAuthorizationCount === 1 ? '1 approval needed' : `${pendingAuthorizationCount} approvals needed`;
		const remainingActiveCount = runningCount + enqueuedCount;

		return remainingActiveCount > 0 ? `${approvalsText}, ${remainingActiveCount} more active` : approvalsText;
	}

	if (runningCount > 0) {
		if (enqueuedCount > 0) return `${runningCount} running, ${enqueuedCount} queued`;
		return runningCount === 1 ? '1 running' : `${runningCount} running`;
	}

	return enqueuedCount === 1 ? '1 queued' : `${enqueuedCount} queued`;
}

function getStatusLabel(status: Doc<'actions'>['status']) {
	//
	if (status === 'blocked') return 'waiting for your authorization';
	if (status === 'running') return 'running now';
	if (status === 'enqueued') return 'queued';
	return status;
}

function buildActionPreview(action: Doc<'actions'>) {
	//
	const message = getStringArg(action, 'message');
	if (message) return truncate(message, 72);

	const instructions = getStringArg(action, 'instructions');
	if (instructions) return truncate(instructions, 72);

	const query = getStringArg(action, 'query');
	if (query) return truncate(query, 72);

	const prompt = getStringArg(action, 'prompt');
	if (prompt) return truncate(prompt, 72);

	const url = getStringArg(action, 'url');
	if (url) return truncate(url, 72);

	const note = getStringArg(action, 'note');
	if (note) return truncate(note, 72);

	return null;
}

function getStringArg(action: Doc<'actions'>, key: string) {
	//
	const value = action.args[key];
	if (typeof value !== 'string') return null;

	return value.trim() || null;
}

function truncate(value: string, maxLength: number) {
	//
	if (value.length <= maxLength) return value;

	return value.slice(0, maxLength - 3) + '...';
}
