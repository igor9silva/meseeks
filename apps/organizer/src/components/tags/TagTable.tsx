import { useState, type ReactNode } from 'react';
import { Lock } from 'lucide-react';
import type { CountRow, TagReportRow } from '~/server/taskReport';
import {
	formatNumber,
	formatPercent,
	formatTagLabel,
	getCount,
	nextSort,
	priorityClassName,
	priorityLabels,
	sortTags,
	tagHref,
	taskSectionLabels,
	type TagSort,
} from './tagUtils';

export function TagTable({ tags, totalTasks }: { tags: TagReportRow[]; totalTasks: number }) {
	//
	const [sort, setSort] = useState<TagSort>({
		key: 'count',
		direction: 'desc',
	});
	const sortedTags = sortTags(tags, sort);

	return (
		<div className="overflow-x-auto rounded border border-border bg-card">
			<table className="w-full min-w-full border-collapse text-sm">
				<thead>
					<tr>
						<SortableTh label="Tag" sortKey="tag" sort={sort} onSort={setSort} />
						<SortableTh label="Count" sortKey="count" sort={sort} onSort={setSort} align="right" />
						<SortableTh label="Inbox" sortKey="inbox" sort={sort} onSort={setSort} align="right" />
						<SortableTh label="Tasks" sortKey="tasks" sort={sort} onSort={setSort} />
						<SortableTh
							label="References"
							sortKey="references"
							sort={sort}
							onSort={setSort}
							align="right"
						/>
						<SortableTh label="Ideas" sortKey="ideas" sort={sort} onSort={setSort} align="right" />
						<SortableTh label="Priorities" sortKey="priorities" sort={sort} onSort={setSort} />
					</tr>
				</thead>
				<tbody>
					{sortedTags.map((tag) => (
						<tr key={tag.tag}>
							<Td>
								<a
									href={tagHref(tag.tag)}
									title={tag.tag}
									className="font-medium text-cyan-300 hover:text-cyan-200"
								>
									{formatTagLabel(tag)}
								</a>
								<div className="mt-1 text-xs text-muted-foreground">
									{formatPercent(tag.count, totalTasks)} of tasks
								</div>
							</Td>
							<Td align="right">
								<CountWithPublic total={tag.count} publicCount={tag.publicCount} />
							</Td>
							<Td align="right">{formatNumber(getCount(tag.sections, 'inbox'))}</Td>
							<Td>
								<InlineCounts rows={tag.sections} labels={taskSectionLabels} />
							</Td>
							<Td align="right">{formatNumber(getCount(tag.sections, 'references'))}</Td>
							<Td align="right">{formatNumber(getCount(tag.sections, 'ideas'))}</Td>
							<Td>
								<InlineCounts rows={tag.priorities} labels={priorityLabels} colorPriority />
							</Td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function InlineCounts({
	rows,
	labels,
	colorPriority = false,
}: {
	rows: CountRow[];
	labels: string[];
	colorPriority?: boolean;
}) {
	//
	return (
		<div className="flex flex-wrap gap-1">
			{labels.map((label) => (
				<span
					key={label}
					className={`rounded border border-border px-1.5 py-0.5 text-xs ${colorPriority ? priorityClassName(label) : ''}`}
				>
					{label} <span className="text-muted-foreground">{getCount(rows, label)}</span>
				</span>
			))}
		</div>
	);
}

function SortableTh({
	label,
	sortKey,
	sort,
	onSort,
	align = 'left',
}: {
	label: string;
	sortKey: TagSort['key'];
	sort: TagSort;
	onSort: (sort: TagSort) => void;
	align?: 'left' | 'right';
}) {
	//
	const isActive = sort.key === sortKey;
	const indicator = isActive && sort.direction === 'asc' ? '↑' : isActive ? '↓' : '';

	return (
		<th
			className={`border-b border-border bg-zinc-900 px-3 py-2 font-medium text-muted-foreground ${align === 'right' ? 'text-right' : 'text-left'}`}
		>
			<button
				type="button"
				onClick={() => onSort(nextSort(sort, sortKey))}
				className={`inline-flex items-center gap-1 rounded text-left hover:text-foreground ${align === 'right' ? 'justify-end' : ''}`}
			>
				<span>{label}</span>
				<span className="w-3 text-xs">{indicator}</span>
			</button>
		</th>
	);
}

function Td({ children, align = 'left' }: { children: ReactNode; align?: 'left' | 'right' }) {
	//
	return (
		<td
			className={`border-b border-border px-3 py-2 align-top last:border-b-0 ${align === 'right' ? 'text-right tabular-nums' : 'text-left'}`}
		>
			{children}
		</td>
	);
}

function CountWithPublic({ total, publicCount }: { total: number; publicCount: number }) {
	//
	const privateCount = total - publicCount;

	return (
		<span className="inline-flex items-center justify-end gap-1 tabular-nums">
			<span>{formatNumber(publicCount)}</span>
			<span className="text-muted-foreground">/</span>
			<span>{formatNumber(privateCount)}</span>
			<Lock className="size-3 text-muted-foreground" aria-label="private" />
		</span>
	);
}
