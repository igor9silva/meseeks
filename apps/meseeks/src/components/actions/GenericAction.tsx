import { useNavigate } from '@tanstack/react-router';
import { Bug } from 'lucide-react';
import { useMemo } from 'react';
import { ActionComponentProps } from '~/components/actions';
import { useKeyboardShortcut } from '@reactor/ui/hooks/useKeyboardShortcuts';
import { cn } from '@reactor/ui/lib/utils';

import { asDollars } from 'lib/money';
import { Button } from '@reactor/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@reactor/ui/collapsible';
import { LoadingButton } from '@reactor/ui/loading-button';
import MDX from '~/components/ui/mdx';
import { FailedMessage } from '~/components/ui/message';
import { TextShimmer } from '@reactor/ui/text-shimmer';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@reactor/ui/tooltip';
import { useApproveAction, useRejectAction } from '~/hooks/useFileMutations';

export function GenericAction(props: ActionComponentProps) {
	//
	const { action, isAuthorCurrentUser, initialRenderDate, fileId, className, suppressAnchorId } = props;
	const { approveAction, isApprovingAction } = useApproveAction();
	const { rejectAction, isRejectingAction } = useRejectAction();
	const isNew = useMemo(() => {
		return new Date(action._creationTime) > initialRenderDate;
	}, [action, initialRenderDate]);

	const handleApprove = () => {
		if (isApprovingAction) return;
		approveAction({ fileId, actionId: action._id });
	};

	const handleReject = () => {
		if (isRejectingAction) return;
		rejectAction({ fileId, actionId: action._id });
	};

	// ⌥+Enter shortcut to authorize
	useKeyboardShortcut({
		global: true,
		combo: { withAlt: true, key: 'Enter' },
		callback: () => {
			if (action.status === 'pending authorization' && !isApprovingAction) {
				handleApprove();
			}
		},
	});

	if (action.skillKey === 'react' && (action.status === 'succeeded' || action.status === 'skipped')) {
		return null;
	}

	return (
		<div
			id={suppressAnchorId ? undefined : `action-${action._id}`}
			className={cn(className, 'flex flex-row justify-between', {
				'ml-auto': isAuthorCurrentUser,
				'animate-in duration-100': isNew,
				'slide-in-from-right': isNew && isAuthorCurrentUser,
				'slide-in-from-left': isNew && !isAuthorCurrentUser,
			})}
		>
			<div className="max-w-full">
				{action.status === 'pending authorization' ? (
					<div className="flex flex-col gap-2 p-2 rounded-3xl bg-muted">
						<div className="flex flex-col">
							<div className="text-md font-medium">{action.skillKey}()</div>
							{typeof action.expectedCost === 'bigint' && (
								<div className="text-sm text-muted-foreground">
									Expected cost: ${asDollars({ bigInt: action.expectedCost, precision: 6 })} ⚡
								</div>
							)}
						</div>

						{action.args && Object.keys(action.args).length > 0 && (
							<div className="mt-1">
								<div className="text-sm font-medium">Arguments:</div>
								<div className="text-sm font-mono bg-background/30 p-2 rounded-lg overflow-auto max-h-48">
									<StructuredValue value={action.args} />
								</div>
							</div>
						)}

						{/* <div className="text-sm text-muted-foreground mt-1">
							This action requires your authorization
						</div> */}
						<div className="flex gap-2">
							<LoadingButton
								size="sm"
								variant="default"
								onClick={handleApprove}
								loading={isApprovingAction}
								loadingText="Authorizing..."
							>
								Authorize
							</LoadingButton>
							<LoadingButton
								size="sm"
								variant="destructive"
								onClick={handleReject}
								loading={isRejectingAction}
								loadingText="Skipping..."
							>
								Skip
							</LoadingButton>
						</div>
					</div>
				) : (
					<>
						{action.status === 'enqueued' || action.status === 'running' ? (
							<TextShimmer text={`Performing ${action.skillKey}(${formatArgs(action.args)})`} />
						) : (
							<Result
								isAuthorCurrentUser={isAuthorCurrentUser}
								result={action.resultFile ? `Result saved to ${action.resultFile}` : ''}
								status={action.status}
								skillKey={action.skillKey}
								args={action.args}
								className={cn({
									'bg-primary text-primary-foreground rounded-3xl border border-border p-2':
										isAuthorCurrentUser && action.skillKey === 'say',
									'bg-muted rounded-3xl p-2': isAuthorCurrentUser && action.skillKey !== 'say',
								})}
								actionId={action._id}
							/>
						)}
					</>
				)}
			</div>
		</div>
	);
}

function Result({
	result,
	isAuthorCurrentUser, //
	skillKey,
	args,
	className,
	status,
	actionId,
}: {
	result: string;
	isAuthorCurrentUser: boolean;
	skillKey: string;
	args: Record<string, unknown>;
	className?: string;
	status: ActionComponentProps['action']['status'];
	actionId: string;
}) {
	if (status === 'failed') {
		return (
			<FailedMessage text={`Failed to ${skillKey}()`} error={result} isAuthorCurrentUser={isAuthorCurrentUser} />
		);
	}

	const mdx = () => <MDX text={result} errorFallback={<pre className="whitespace-pre-wrap">{result}</pre>} />;
	const argsString = formatArgs(args);

	return (
		<Collapsible className={cn('text-sm', className)}>
			<CollapsibleTrigger>
				<div className={cn('text-muted-foreground text-start', { 'line-through': status === 'skipped' })}>
					Performed {skillKey}({argsString}).
				</div>
			</CollapsibleTrigger>
			<CollapsibleContent>
				<div className="flex items-center justify-between gap-2 my-2">
					<div className="flex-1">{result.length < 280 ? mdx() : 'Too big to display. Use Dev Mode.'}</div>
					<InspectButton actionId={actionId} />
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}

function InspectButton({ actionId }: { actionId: string }) {
	//
	const navigate = useNavigate();

	const handleInspectClick = (e?: React.MouseEvent) => {
		e?.stopPropagation();

		// Navigate to dev mode with action anchor
		navigate({
			to: '/$',
			search: (prev) => ({ ...prev, debug: true }),
			hash: `action-${actionId}`,
		});
	};

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="outline"
						size="sm"
						onClick={handleInspectClick}
						className="h-8 w-8 p-0 flex-shrink-0"
					>
						<Bug className="h-4 w-4" />
					</Button>
				</TooltipTrigger>
				<TooltipContent className="px-2 py-1 text-xs">Inspect in dev mode</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

// Recursive component to display structured data
function StructuredValue({ value, depth = 0 }: { value: unknown; depth?: number }) {
	//
	if (value === null) return <span className="text-muted-foreground">null</span>;
	if (value === undefined) return <span className="text-muted-foreground">undefined</span>;

	if (typeof value === 'string') return <span className="text-green-400">"{value}"</span>;
	if (typeof value === 'number') return <span className="text-amber-400">{value}</span>;
	if (typeof value === 'boolean') return <span className="text-purple-400">{value ? 'true' : 'false'}</span>;

	if (Array.isArray(value)) {
		if (value.length === 0) return <span className="text-muted-foreground">[]</span>;

		return (
			<div>
				<span>[</span>
				<div>
					{value.map((item, index) => (
						<div key={index} className="flex gap-1">
							<StructuredValue value={item} depth={depth} />
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
			<div>
				<div>
					{entries.map(([key, val], index) => (
						<div key={key} className="flex gap-1">
							<span className="font-semibold text-blue-400">{key}:</span>{' '}
							<StructuredValue value={val} depth={depth} />
							{index < entries.length - 1 && <span>,</span>}
						</div>
					))}
				</div>
			</div>
		);
	}

	return <span className="text-muted-foreground">{String(value)}</span>;
}

function formatArgs(args: Record<string, unknown>): string {
	//
	if (Object.keys(args).length === 0) return '';

	if (Object.keys(args).length === 1) {
		//
		const key = Object.keys(args)[0];
		const value = args[key];
		const type = typeof value;

		switch (type) {
			case 'string':
				return `"${value}"`;
			case 'number':
				return `${value}`;
			case 'boolean':
				return `${value ? 'true' : 'false'}`;
		}
	}

	return `{ ${Object.keys(args).join(', ')} }`;
}
