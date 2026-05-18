import type { IndexHealth } from '~/server/taskIndexRepository';

export interface CountRow {
	label: string;
	count: number;
}

export interface SectionReportRow {
	section: string;
	publicCount: number;
	privateCount: number;
	total: number;
	rootCount: number;
	childCount: number;
	warningCount: number;
}

export interface PriorityReportRow {
	priority: string;
	total: number;
	sections: CountRow[];
}

export interface StatusReportRow {
	status: string;
	publicCount: number;
	privateCount: number;
	total: number;
	rootCount: number;
	childCount: number;
}

export interface TaskReportRow {
	key: string;
	title: string;
	source: string;
	section: string;
	priority: string;
	words: number;
	warningCount: number;
	childCount: number;
	tags: string[];
}

export interface TagReportRow {
	tag: string;
	key: string | null;
	value: string;
	count: number;
	publicCount: number;
	privateCount: number;
	rootCount: number;
	childCount: number;
	sections: CountRow[];
	priorities: CountRow[];
	examples: TaskReportRow[];
}

export interface TagGroupReport {
	key: string | null;
	total: number;
	uniqueTags: number;
	tags: TagReportRow[];
}

export interface SubtaskReport {
	parentTasks: number;
	childTasks: number;
	rootTasks: number;
	unresolvedEdges: number;
	childrenBySection: CountRow[];
	parentsBySection: CountRow[];
	topParents: TaskReportRow[];
}

export interface QualityReport {
	scopeCount: number;
	warnings: number;
	wordBands: CountRow[];
	warningsByArea: CountRow[];
	tinyTasks: TaskReportRow[];
	largeTasks: TaskReportRow[];
}

export interface TaskReportTags {
	totalTags: number;
	uniqueTags: number;
	groups: TagGroupReport[];
	all: TagReportRow[];
}

export interface TaskReport {
	health: IndexHealth;
	reportedAt: string;
	indexGeneratedAt: string | null;
	totals: {
		tasks: number;
		publicTasks: number;
		privateTasks: number;
		warnings: number;
		taggedTasks: number;
		untaggedTasks: number;
		referenceTasks: number;
		workTasks: number;
	};
	sections: SectionReportRow[];
	statuses: StatusReportRow[];
	priorities: PriorityReportRow[];
	sourceTags: CountRow[];
	activeTasks: TaskReportRow[];
	quality: QualityReport;
	subtasks: SubtaskReport;
	tags: TaskReportTags;
}
