import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import type { Doc, Id } from 'convex/_generated/dataModel';
import type { ReactNode } from 'react';
import { api } from 'convex/_generated/api';
import { Badge } from '@reactor/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@reactor/ui/card';
import { useRootSkills } from '~/hooks/query/useSkills';

export function CompiledStatePanel({ root }: { root: Id<'files'> }) {
	//
	const { skills } = useRootSkills(root);
	const pagesQuery = convexQuery(api.pages.listByRoot, { root });
	const triggersQuery = convexQuery(api.triggers.findByRoot, { root });
	const { data: pages } = useSuspenseQuery(pagesQuery);
	const { data: triggers } = useSuspenseQuery(triggersQuery);
	const sortedSkills = skills
		.slice()
		.sort((left, right) => left.kind.localeCompare(right.kind) || left.key.localeCompare(right.key));
	const fileSkills = sortedSkills.filter((skill) => skill.source === 'file');
	const availableTriggers = triggers.filter((trigger) => trigger.status === 'enabled');
	const availablePages = pages.filter((page) => page.status === 'enabled');
	const lastCompiledAt = Math.max(
		0,
		...sortedSkills.map((skill) => skill.compiledAt ?? 0),
		...availablePages.map((page) => page.compiledAt ?? 0),
		...availableTriggers.map((trigger) => trigger.compiledAt ?? 0),
	);
	const state = lastCompiledAt > 0 ? 'compiled' : 'base';

	return (
		<Card className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
			<CardHeader className="shrink-0 pb-3">
				<CardTitle className="text-sm">Compiled State</CardTitle>
			</CardHeader>
			<CardContent className="grid min-h-0 min-w-0 flex-1 content-start gap-3 overflow-y-auto p-3 pt-0">
				<Section label="Skills" count={sortedSkills.length}>
					{sortedSkills.length === 0 ? (
						<Empty />
					) : (
						sortedSkills.map((skill) => <SkillRow key={skill._id} skill={skill} />)
					)}
				</Section>

				<Section label="Triggers" count={availableTriggers.length}>
					{availableTriggers.length === 0 ? (
						<Empty />
					) : (
						availableTriggers.map((trigger) => <TriggerRow key={trigger._id} trigger={trigger} />)
					)}
				</Section>

				<Section label="Pages" count={availablePages.length}>
					{availablePages.length === 0 ? (
						<Empty />
					) : (
						availablePages.map((page) => <PageRow key={page._id} page={page} />)
					)}
				</Section>

				<Summary
					fileSkillCount={fileSkills.length}
					lastCompiledAt={lastCompiledAt}
					pageCount={availablePages.length}
					root={root}
					skillCount={sortedSkills.length}
					state={state}
					triggerCount={availableTriggers.length}
				/>
			</CardContent>
		</Card>
	);
}

function Section({ children, count, label }: { children: ReactNode; count: number; label: string }) {
	//
	return (
		<div className="grid min-w-0 gap-1">
			<div className="text-xs font-medium text-muted-foreground">
				{label} ({count})
			</div>
			<div className="grid min-w-0 gap-1">{children}</div>
		</div>
	);
}

function SkillRow({ skill }: { skill: Doc<'skills'> }) {
	//
	return (
		<div className="min-w-0 rounded-md border px-2 py-1 text-xs">
			<div className="flex min-w-0 items-center justify-between gap-2">
				<span className="min-w-0 truncate font-mono">{skill.key}</span>
				<span className="shrink-0 text-muted-foreground">{skill.kind}</span>
			</div>
		</div>
	);
}

function TriggerRow({ trigger }: { trigger: Doc<'triggers'> }) {
	//
	return (
		<div className="min-w-0 rounded-md border px-2 py-1 text-xs">
			<div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
				<div className="min-w-0">
					<div className="truncate font-mono">{trigger.kind}</div>
					{trigger.kind === 'mutation' ? (
						<div className="mt-1 truncate text-muted-foreground">
							{trigger.pattern || '*'} -&gt;{' '}
							{trigger.reactions.map((reaction) => reaction.skill).join(', ')}
						</div>
					) : null}
				</div>
				<span className="self-center text-muted-foreground">{trigger.runCount}</span>
			</div>
		</div>
	);
}

function PageRow({ page }: { page: Doc<'pages'> }) {
	//
	return (
		<Link
			to="/$"
			params={{ _splat: page.route.replace(/^\//, '') }}
			className="min-w-0 rounded-md border px-2 py-1 text-xs hover:bg-accent"
		>
			<div className="truncate font-mono">{page.route}</div>
		</Link>
	);
}

function Empty() {
	//
	return <div className="rounded-md border border-dashed px-2 py-1 text-xs text-muted-foreground">none</div>;
}

function Summary({
	fileSkillCount,
	lastCompiledAt,
	pageCount,
	root,
	skillCount,
	state,
	triggerCount,
}: {
	fileSkillCount: number;
	lastCompiledAt: number;
	pageCount: number;
	root: Id<'files'>;
	skillCount: number;
	state: string;
	triggerCount: number;
}) {
	//
	return (
		<div className="mt-auto grid min-w-0 gap-1 border-t pt-2 text-xs">
			<SummaryRow
				label="state"
				value={<Badge variant={state === 'compiled' ? 'secondary' : 'outline'}>{state}</Badge>}
			/>
			<SummaryRow label="skills" value={skillCount} />
			<SummaryRow label="file skills" value={fileSkillCount} />
			<SummaryRow label="triggers" value={triggerCount} />
			<SummaryRow label="pages" value={pageCount} />
			<SummaryRow
				label="last compile"
				value={lastCompiledAt > 0 ? new Date(lastCompiledAt).toLocaleTimeString() : 'none'}
			/>
			<SummaryRow label="root" value={root} />
		</div>
	);
}

function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
	//
	return (
		<div className="flex min-w-0 items-center justify-between gap-2">
			<span className="text-muted-foreground">{label}</span>
			<span className="min-w-0 truncate font-mono">{value}</span>
		</div>
	);
}
