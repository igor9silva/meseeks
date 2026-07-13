import { createFileRoute } from '@tanstack/react-router';
import { zid } from 'convex-helpers/server/zod3';
import type { Id } from 'convex/_generated/dataModel';
import { Badge } from '@pro/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@pro/ui/card';
import { BasicError } from '~/components/BasicError';
import { useActionDetails } from '~/hooks/query/useActionDetails';

export const Route = createFileRoute('/action_/$id')({
	component: ActionPage,
	errorComponent: () => <BasicError text="Failed to load this action." />,
});

function ActionPage() {
	//
	const { id } = Route.useParams();
	const parsed = zid('actions').safeParse(id);
	if (!parsed.success) return <BasicError text="Action not found." />;

	return <ActionDetail actionId={parsed.data} />;
}

function ActionDetail({ actionId }: { actionId: Id<'actions'> }) {
	//
	const { actionDetails } = useActionDetails(actionId);
	if (!actionDetails) return <BasicError text="Action not found." />;

	const { action, details } = actionDetails;

	return (
		<div className="h-full overflow-auto">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 md:p-6">
				<header className="flex flex-wrap items-start justify-between gap-3">
					<div className="min-w-0">
						<h1 className="truncate text-2xl font-semibold">{action.skillKey}()</h1>
						<p className="font-mono text-xs text-muted-foreground">{action._id}</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<Badge>{action.status}</Badge>
						<Badge variant="secondary">#{action.index}</Badge>
						<Badge variant="outline">depth {action.depth}</Badge>
					</div>
				</header>

				<section className="grid gap-4 lg:grid-cols-3">
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Lifecycle</CardTitle>
							<CardDescription>{action.file}</CardDescription>
						</CardHeader>
						<CardContent>
							<pre className="overflow-auto rounded border bg-muted/30 p-3 font-mono text-xs whitespace-pre-wrap">
								{stringifyForDisplay({
									createdAt: action.createdAt,
									claimedAt: action.claimedAt,
									startedAt: action.startedAt,
									settledAt: action.settledAt,
									interruptedAt: action.interruptedAt,
									authorizedAt: action.authorizedAt,
									author: action.author,
									spark: action.spark,
									loopKey: action.loopKey,
								})}
							</pre>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="text-base">Selection</CardTitle>
						</CardHeader>
						<CardContent>
							<pre className="overflow-auto rounded border bg-muted/30 p-3 font-mono text-xs whitespace-pre-wrap">
								{stringifyForDisplay({
									loop: action.loopKey,
									intelligence: action.intelligenceKey,
								})}
							</pre>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="text-base">Costs</CardTitle>
						</CardHeader>
						<CardContent>
							<pre className="overflow-auto rounded border bg-muted/30 p-3 font-mono text-xs whitespace-pre-wrap">
								{stringifyForDisplay({
									expectedCost: action.expectedCost,
									maxCost: action.maxCost,
									reservedBudget: action.reservedBudget,
									costs: action.costs,
								})}
							</pre>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="text-base">Args</CardTitle>
						</CardHeader>
						<CardContent>
							<pre className="overflow-auto rounded border bg-muted/30 p-3 font-mono text-xs whitespace-pre-wrap">
								{stringifyForDisplay(action.args)}
							</pre>
						</CardContent>
					</Card>
				</section>

				<section className="grid gap-4 lg:grid-cols-2">
					<ActionBlock title="Result" value={action.result} />
					<ActionBlock title="Details" value={details} />
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Patch</CardTitle>
						</CardHeader>
						<CardContent>
							<pre className="max-h-96 overflow-auto rounded border bg-muted/30 p-3 font-mono text-xs whitespace-pre-wrap break-words">
								{action.patch ?? 'No patch.'}
							</pre>
						</CardContent>
					</Card>
				</section>
			</div>
		</div>
	);
}

function ActionBlock({ title, value }: { title: string; value: unknown }) {
	//
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">{title}</CardTitle>
			</CardHeader>
			<CardContent>
				<pre className="max-h-96 overflow-auto rounded border bg-muted/30 p-3 font-mono text-xs whitespace-pre-wrap break-words">
					{value === undefined ? 'None.' : stringifyForDisplay(value)}
				</pre>
			</CardContent>
		</Card>
	);
}

function stringifyForDisplay(value: unknown) {
	//
	return JSON.stringify(
		value,
		(_key, item: unknown) => {
			if (typeof item === 'bigint') return item.toString();
			return item;
		},
		2,
	);
}
