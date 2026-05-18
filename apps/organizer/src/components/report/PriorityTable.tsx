import { useState } from 'react';
import { PriorityPill, SortableTh, Table, Td } from '~/components/report/ReportPrimitives';
import {
	formatNumber,
	formatTaskSectionLabel,
	getCount,
	priorityDotClassName,
	priorityRank,
} from '~/components/report/reportFormat';
import { compareValues, type SortState } from '~/components/report/reportSort';
import type { TaskReport } from '~/server/taskReport';

interface PrioritySort extends SortState {
	key: string;
}

export function PriorityTable({ report }: { report: TaskReport }) {
	//
	const [sort, setSort] = useState<PrioritySort>({
		key: 'total',
		direction: 'desc',
	});
	const prioritySections = report.priorities[0]?.sections ?? [];
	const rows = sortPriorityRows(report.priorities, sort);

	return (
		<Table>
			<thead>
				<tr>
					<SortableTh label="Priority" sortKey="priority" sort={sort} onSort={setSort} />
					<SortableTh label="Total" sortKey="total" sort={sort} onSort={setSort} align="right" />
					{prioritySections.map((row) => (
						<SortableTh
							key={row.label}
							label={formatTaskSectionLabel(row.label)}
							sortKey={`section:${row.label}`}
							sort={sort}
							onSort={setSort}
							align="right"
						/>
					))}
				</tr>
			</thead>
			<tbody>
				{rows.map((row) => (
					<tr key={row.priority}>
						<Td>
							<div className="flex items-center gap-2">
								<span className={`size-2 rounded-full ${priorityDotClassName(row.priority)}`} />
								<PriorityPill priority={row.priority} />
							</div>
						</Td>
						<Td align="right">{formatNumber(row.total)}</Td>
						{row.sections.map((section) => (
							<Td key={section.label} align="right">
								{formatNumber(section.count)}
							</Td>
						))}
					</tr>
				))}
			</tbody>
		</Table>
	);
}

function sortPriorityRows(rows: TaskReport['priorities'], sort: PrioritySort) {
	//
	return rows
		.slice()
		.sort((left, right) =>
			compareValues(getPriorityRowValue(left, sort.key), getPriorityRowValue(right, sort.key), sort.direction),
		);
}

function getPriorityRowValue(row: TaskReport['priorities'][number], key: string) {
	//
	if (key === 'priority') return priorityRank(row.priority);
	if (key === 'total') return row.total;
	if (key.startsWith('section:')) return getCount(row.sections, key.slice('section:'.length));

	return 0;
}
