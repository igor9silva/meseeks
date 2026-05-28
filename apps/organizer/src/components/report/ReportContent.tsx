import { Archive, BarChart3, CircleDot, Database, FolderKanban, GitBranch, Inbox, Lock, Tags, Zap } from 'lucide-react';
import { CountBars } from '~/components/report/ReportCountBars';
import { Metric, Section, SectionHeading } from '~/components/report/ReportPrimitives';
import { formatNumber, formatPercent } from '~/components/report/reportFormat';
import { PriorityTable } from '~/components/report/PriorityTable';
import { SectionFlow } from '~/components/report/SectionFlow';
import { SourceSummary } from '~/components/report/SourceSummary';
import { SubtaskSummary } from '~/components/report/SubtaskSummary';
import { TaskTable } from '~/components/report/TaskTable';
import type { TaskReport } from '~/server/taskReport';

export function ReportContent({ report }: { report: TaskReport }) {
	//
	return (
		<>
			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				<Metric
					icon={<Database className="size-4" />}
					label="Tasks"
					value={formatNumber(report.totals.tasks)}
					detail="public + private"
				/>
				<Metric
					icon={<Lock className="size-4" />}
					label="Private"
					value={formatNumber(report.totals.privateTasks)}
					detail={`${formatPercent(report.totals.privateTasks, report.totals.tasks)} of all tasks`}
				/>
				<Metric
					icon={<Inbox className="size-4" />}
					label="Work tasks"
					value={formatNumber(report.totals.workTasks)}
					detail="references excluded"
				/>
				<Metric
					icon={<GitBranch className="size-4" />}
					label="Children"
					value={formatNumber(report.subtasks.childTasks)}
					detail={`${formatNumber(report.subtasks.parentTasks)} parent tasks`}
				/>
			</div>

			<div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
				<Section title="Sections" icon={<FolderKanban className="size-5" />}>
					<SectionFlow report={report} />
				</Section>

				<Section title="Priorities" icon={<CircleDot className="size-5" />}>
					<PriorityTable report={report} />
				</Section>
			</div>

			<div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
				<Section title="Sources" icon={<Archive className="size-5" />}>
					<SourceSummary report={report} />
				</Section>

				<Section title="Subtasks" icon={<GitBranch className="size-5" />}>
					<SubtaskSummary report={report} />
				</Section>
			</div>

			<Section title="Active" icon={<Zap className="size-5" />}>
				<TaskTable rows={report.activeTasks} showSection />
			</Section>

			<Section title="Quality Signals" icon={<BarChart3 className="size-5" />}>
				<QualitySignals report={report} />
			</Section>

			<Section title="Outliers" icon={<BarChart3 className="size-5" />}>
				<div className="grid gap-4 xl:grid-cols-2">
					<div>
						<SectionHeading title="Smallest non-reference tasks" detail="under 30 words" />
						<TaskTable rows={report.quality.tinyTasks} compact />
					</div>
					<div>
						<SectionHeading title="Largest non-reference tasks" detail="sorted by body word count" />
						<TaskTable rows={report.quality.largeTasks} compact />
					</div>
				</div>
			</Section>
		</>
	);
}

function QualitySignals({ report }: { report: TaskReport }) {
	//
	return (
		<div className="grid gap-4 xl:grid-cols-2">
			<div>
				<SectionHeading
					title="Word counts"
					detail={`${formatNumber(report.quality.scopeCount)} non-reference tasks`}
				/>
				<CountBars rows={report.quality.wordBands} total={report.quality.scopeCount} />
			</div>
			<div>
				<SectionHeading title="Tag coverage" detail="all tasks" />
				<CountBars
					rows={[
						{ label: 'tagged', count: report.totals.taggedTasks },
						{ label: 'untagged', count: report.totals.untaggedTasks },
					]}
					total={report.totals.tasks}
				/>
				<a
					href="/tags"
					className="mt-4 inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-200"
				>
					<Tags className="size-4" />
					Open tag report
				</a>
			</div>
		</div>
	);
}
