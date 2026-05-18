import { useState } from 'react';
import { PriorityPill, SortableTh, Table, Td } from '~/components/report/ReportPrimitives';
import { formatNumber, formatTaskSectionLabel, priorityRank, taskHref } from '~/components/report/reportFormat';
import { compareValues, type SortState } from '~/components/report/reportSort';
import type { TaskReportRow } from '~/server/taskReport';

interface TaskSort extends SortState {
	key: 'title' | 'section' | 'source' | 'priority' | 'words' | 'children';
}

export function TaskTable({
	rows,
	showSection = false,
	compact = false,
}: {
	rows: TaskReportRow[];
	showSection?: boolean;
	compact?: boolean;
}) {
	//
	const [sort, setSort] = useState<TaskSort>({
		key: 'title',
		direction: 'asc',
	});
	const sortedRows = sortTaskRows(rows, sort);

	if (rows.length === 0) {
		return <div className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">No tasks.</div>;
	}

	return (
		<Table>
			<thead>
				<tr>
					<SortableTh label="Task" sortKey="title" sort={sort} onSort={setSort} />
					{showSection ? <SortableTh label="Section" sortKey="section" sort={sort} onSort={setSort} /> : null}
					<SortableTh label="Source" sortKey="source" sort={sort} onSort={setSort} />
					<SortableTh label="Priority" sortKey="priority" sort={sort} onSort={setSort} />
					<SortableTh label="Words" sortKey="words" sort={sort} onSort={setSort} align="right" />
					<SortableTh label="Children" sortKey="children" sort={sort} onSort={setSort} align="right" />
				</tr>
			</thead>
			<tbody>
				{sortedRows.map((row) => (
					<tr key={row.key}>
						<Td>
							<a href={taskHref(row.key)} className="font-medium text-cyan-300 hover:text-cyan-200">
								{row.title}
							</a>
							{compact ? null : (
								<div className="mt-1 break-all text-xs text-muted-foreground">{row.key}</div>
							)}
							{row.tags.length > 0 && !compact ? (
								<div className="mt-2 flex flex-wrap gap-1">
									{row.tags.slice(0, 8).map((tag) => (
										<span
											key={tag}
											className="rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground"
										>
											{tag}
										</span>
									))}
								</div>
							) : null}
						</Td>
						{showSection ? <Td>{formatTaskSectionLabel(row.section)}</Td> : null}
						<Td>{row.source}</Td>
						<Td>
							<PriorityPill priority={row.priority} />
						</Td>
						<Td align="right">{formatNumber(row.words)}</Td>
						<Td align="right">{formatNumber(row.childCount)}</Td>
					</tr>
				))}
			</tbody>
		</Table>
	);
}

function sortTaskRows(rows: TaskReportRow[], sort: TaskSort) {
	//
	return rows
		.slice()
		.sort((left, right) =>
			compareValues(getTaskRowValue(left, sort.key), getTaskRowValue(right, sort.key), sort.direction),
		);
}

function getTaskRowValue(row: TaskReportRow, key: TaskSort['key']) {
	//
	if (key === 'title') return row.title;
	if (key === 'section') return row.section;
	if (key === 'source') return row.source;
	if (key === 'priority') return priorityRank(row.priority);
	if (key === 'words') return row.words;
	if (key === 'children') return row.childCount;

	return '';
}
