import { CountBars } from '~/components/report/ReportCountBars';
import { Metric, SectionHeading } from '~/components/report/ReportPrimitives';
import { formatNumber } from '~/components/report/reportFormat';
import type { TaskReport } from '~/server/taskReport';
import { TaskTable } from './TaskTable';

export function SubtaskSummary({ report }: { report: TaskReport }) {
	//
	return (
		<div className="space-y-4">
			<div className="grid gap-3 md:grid-cols-4">
				<Metric
					label="Parents"
					value={formatNumber(report.subtasks.parentTasks)}
					detail="tasks with children"
				/>
				<Metric
					label="Children"
					value={formatNumber(report.subtasks.childTasks)}
					detail="resolved child edges"
				/>
				<Metric label="Roots" value={formatNumber(report.subtasks.rootTasks)} detail="not a child task" />
				<Metric
					label="Unresolved"
					value={formatNumber(report.subtasks.unresolvedEdges)}
					detail="parent edges"
				/>
			</div>
			<div className="grid gap-4 xl:grid-cols-2">
				<div>
					<SectionHeading title="Children by section" />
					<CountBars rows={report.subtasks.childrenBySection} total={report.subtasks.childTasks} />
				</div>
				<div>
					<SectionHeading title="Parents by section" />
					<CountBars rows={report.subtasks.parentsBySection} total={report.subtasks.parentTasks} />
				</div>
			</div>
			<div>
				<SectionHeading title="Largest parent tasks" detail="by child count" />
				<TaskTable rows={report.subtasks.topParents} showSection compact />
			</div>
		</div>
	);
}
