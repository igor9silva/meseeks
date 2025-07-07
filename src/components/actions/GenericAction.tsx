import { Doc, Id } from 'convex/_generated/dataModel';
import { useMemo } from 'react';
import { cn } from '~/lib/utils';

import { asDollars } from 'convex/lib/money';
import { Button } from '~/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible';
import MDX from '~/components/ui/mdx';
import { FailedMessage } from '~/components/ui/message';
import { useTaskMutations } from '~/hooks/useTaskMutations';

export function GenericAction({
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
	const { approveAction, rejectAction } = useTaskMutations();
	const isNew = useMemo(() => {
		return new Date(action._creationTime) > initialRenderDate;
	}, [action, initialRenderDate]);

	if (action.skillKey === 'react' && (action.status === 'succeeded' || action.status === 'skipped')) {
		return null;
	}

	const handleApprove = () => {
		approveAction({ taskId, actionId: action._id });
	};

	const handleReject = () => {
		rejectAction({ taskId, actionId: action._id });
	};

	return (
		<div
			id={`action-${action._id}`}
			className={cn(className, 'flex flex-row justify-between', {
				'ml-auto': isAuthorCurrentUser,
				'animate-in duration-100': isNew,
				'slide-in-from-right': isNew && isAuthorCurrentUser,
				'slide-in-from-left': isNew && !isAuthorCurrentUser,
			})}
		>
			<div
				className={cn('max-w-full', {
					'bg-green-700/30 animate-pulse rounded-xl p-2': action.status === 'running',
					// 'bg-red-700/30 rounded-xl p-2': action.status === 'failed',
				})}
			>
				{action.status === 'pending authorization' ? (
					<div className="flex flex-col gap-2 p-2 rounded-xl bg-muted">
						<div className="flex flex-col">
							<div className="text-md font-medium">{action.skillKey}()</div>
							{typeof action.estimatedCost === 'bigint' && (
								<div className="text-sm text-muted-foreground">
									Expected cost: ${asDollars({ bigInt: action.estimatedCost, precision: 6 })} ⚡
								</div>
							)}
						</div>

						{action.args && Object.keys(action.args).length > 0 && (
							<div className="mt-1">
								<div className="text-sm font-medium">Arguments:</div>
								<div className="text-sm font-mono bg-background/30 p-2 rounded overflow-auto max-h-48">
									<StructuredValue value={action.args} />
								</div>
							</div>
						)}

						{/* <div className="text-sm text-muted-foreground mt-1">
							This action requires your authorization
						</div> */}
						<div className="flex gap-2">
							<Button size="sm" variant="default" onClick={handleApprove}>
								Authorize
							</Button>
							<Button size="sm" variant="destructive" onClick={handleReject}>
								Skip
							</Button>
						</div>
					</div>
				) : (
					<>
						{action.result ? (
							<Result
								isAuthorCurrentUser={isAuthorCurrentUser}
								result={action.result.text ?? ''}
								status={action.status}
								skillKey={action.skillKey}
								args={action.args}
								costs={action.costs}
								// reactions={action.reactions ?? []}
								className={cn({
									'bg-primary text-primary-foreground rounded-xl border border-border p-2':
										isAuthorCurrentUser && action.skillKey === 'say',
									'bg-muted rounded-xl p-2': isAuthorCurrentUser && action.skillKey !== 'say',
								})}
							/>
						) : (
							<div className="text-sm text-muted-foreground">Using {action.skillKey}()</div>
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
	costs,
	status,
}: {
	result: string;
	isAuthorCurrentUser: boolean;
	skillKey: string;
	args: Record<string, any>;
	costs: Array<{
		symbol: string;
		amount: bigint;
		description: string;
	}>;
	className?: string;
	status: 'failed' | 'succeeded' | 'skipped';
}) {
	if (status === 'failed') {
		return (
			<FailedMessage
				text={`🚫 Failed to ${skillKey}()`}
				error={result}
				isAuthorCurrentUser={isAuthorCurrentUser}
			/>
		);
	}

	const mdx = () => <MDX text={result} errorFallback={<pre className="whitespace-pre-wrap">{result}</pre>} />;

	return (
		<Collapsible className={cn('text-sm', className)}>
			<CollapsibleTrigger>
				<div className={cn('text-muted-foreground', { 'line-through': status === 'skipped' })}>
					{skillKey}()
				</div>
			</CollapsibleTrigger>
			<CollapsibleContent>
				<p>
					args: <code>{JSON.stringify(args)}</code>
				</p>
				<p>cost: {asDollars({ bigInt: costs.reduce((acc, cost) => acc + cost.amount, 0n) })}</p>
				<p>result: {result.length < 280 ? mdx() : 'Too big to display. Use Dev Mode.'}</p>
			</CollapsibleContent>
		</Collapsible>
	);
}

// Recursive component to display structured data
function StructuredValue({ value, depth = 0 }: { value: any; depth?: number }) {
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
