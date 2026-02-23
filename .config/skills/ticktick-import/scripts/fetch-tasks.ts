#!/usr/bin/env bun
// ticktick task fetcher
// usage: bun fetch-tasks.ts [--output-dir <dir>]

const BASE_URL = 'https://api.ticktick.com/open/v1';

const API_TOKEN = requireEnv('TICKTICK_API_TOKEN');
const INBOX_ID = process.env.TICKTICK_INBOX_ID ?? null;
const GROUP_NAMES = parseGroupNames();

function requireEnv(name: string): string {
	//
	const value = process.env[name];
	if (!value) {
		console.error(`Missing required env var: ${name}`);
		process.exit(1);
	}
	return value;
}

function parseGroupNames(): Record<string, string> {
	//
	const raw = process.env.TICKTICK_GROUP_NAMES;
	if (!raw) return {};

	try {
		const parsed: unknown = JSON.parse(raw);
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};

		const result: Record<string, string> = {};
		for (const [key, value] of Object.entries(parsed)) {
			if (typeof value === 'string') result[key] = value;
		}
		return result;
	} catch {
		console.warn('TICKTICK_GROUP_NAMES is not valid JSON, ignoring');
		return {};
	}
}

// ── args ────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const outputDirIdx = args.indexOf('--output-dir');
let outputDir = import.meta.dir;

if (outputDirIdx !== -1 && args[outputDirIdx + 1]) {
	const { resolve } = await import('node:path');
	outputDir = resolve(args[outputDirIdx + 1]);
}

// ── types ───────────────────────────────────────────────────────────

interface TickTickProject {
	id: string;
	name: string;
	color: string | null;
	sortOrder: number;
	viewMode?: string;
	kind: string;
	closed?: boolean;
	groupId?: string | null;
}

interface TickTickSubtask {
	id: string;
	title: string;
	status: number;
	sortOrder: number;
}

interface TickTickTask {
	id: string;
	projectId: string;
	title: string;
	content?: string;
	desc?: string;
	timeZone?: string;
	startDate?: string;
	dueDate?: string;
	isAllDay?: boolean;
	repeatFlag?: string;
	reminders?: string[];
	priority: number;
	status: number;
	sortOrder: number;
	items?: TickTickSubtask[];
	tags?: string[];
}

interface ProjectData {
	project: TickTickProject;
	tasks: TickTickTask[];
	columns?: unknown[];
}

interface ProjectWithPath extends TickTickProject {
	path: string;
}

// ── api ─────────────────────────────────────────────────────────────

async function fetchProjects(): Promise<TickTickProject[]> {
	//
	const response = await fetch(`${BASE_URL}/project`, {
		headers: { Authorization: `Bearer ${API_TOKEN}` },
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch projects: ${response.status} ${response.statusText}`);
	}

	return response.json();
}

async function fetchProjectData(projectId: string): Promise<ProjectData | null> {
	//
	const response = await fetch(`${BASE_URL}/project/${projectId}/data`, {
		headers: { Authorization: `Bearer ${API_TOKEN}` },
	});

	if (!response.ok) return null;
	return response.json();
}

async function discoverInboxId(): Promise<string | null> {
	//
	if (INBOX_ID) return INBOX_ID;

	const testPatterns = ['inbox', 'inbox0', 'inbox1'];

	for (const pattern of testPatterns) {
		try {
			const data = await fetchProjectData(pattern);
			if (data?.project) {
				console.log(`Discovered inbox ID: ${pattern}`);
				return pattern;
			}
		} catch {
			// try next pattern
		}
	}

	return null;
}

// ── main ────────────────────────────────────────────────────────────

async function main() {
	//
	const { mkdirSync } = await import('node:fs');
	const { join } = await import('node:path');

	mkdirSync(outputDir, { recursive: true });

	console.log('Fetching all projects...');
	const projects = await fetchProjects();
	console.log(`Found ${projects.length} projects`);

	const uniqueGroupIds = new Set<string>();
	for (const project of projects) {
		if (project.groupId) uniqueGroupIds.add(project.groupId);
	}

	const missingGroups: string[] = [];
	for (const groupId of uniqueGroupIds) {
		if (!GROUP_NAMES[groupId]) missingGroups.push(groupId);
	}

	if (missingGroups.length > 0) {
		console.warn('\n⚠️  Missing group names for these IDs:');
		for (const groupId of missingGroups) {
			const projectsInGroup = projects.filter((p) => p.groupId === groupId).map((p) => p.name);
			console.warn(`  ${groupId}: contains [${projectsInGroup.join(', ')}]`);
		}
		console.warn('Add them to TICKTICK_GROUP_NAMES env var\n');
	}

	const projectsWithPath: ProjectWithPath[] = projects.map((project) => {
		const groupName = project.groupId ? GROUP_NAMES[project.groupId] : null;
		const path = groupName ? `${groupName}/${project.name}` : project.name;
		return { ...project, path };
	});

	const allTasks: (TickTickTask & { projectPath: string })[] = [];
	const projectsWithTasks: { project: ProjectWithPath; tasks: TickTickTask[] }[] = [];

	console.log('\nLooking for Inbox...');
	const inboxId = await discoverInboxId();

	if (inboxId) {
		console.log(`Fetching Inbox tasks (id: ${inboxId})...`);
		try {
			const inboxData = await fetchProjectData(inboxId);
			if (inboxData) {
				const uncompletedTasks = inboxData.tasks.filter((task) => task.status === 0);
				console.log(`  - Found ${uncompletedTasks.length} uncompleted tasks in Inbox`);

				const inboxProject: ProjectWithPath = {
					id: inboxId,
					name: 'Inbox',
					path: 'Inbox',
					color: null,
					sortOrder: -Infinity,
					kind: 'TASK',
					groupId: null,
				};

				projectsWithTasks.push({ project: inboxProject, tasks: uncompletedTasks });
				for (const task of uncompletedTasks) {
					allTasks.push({ ...task, projectPath: 'Inbox' });
				}
			}
		} catch (error) {
			console.error('  - Error fetching Inbox:', error);
		}
	} else {
		console.log('  - Inbox not found. Run discover-inbox.ts to find it.');
	}

	console.log('\nFetching tasks for all projects...');
	for (const project of projectsWithPath) {
		console.log(`Fetching tasks for: ${project.path}`);
		try {
			const projectData = await fetchProjectData(project.id);
			if (!projectData) {
				console.error(`  - Failed to fetch project ${project.path}`);
				continue;
			}
			const uncompletedTasks = projectData.tasks.filter((task) => task.status === 0);
			console.log(`  - Found ${uncompletedTasks.length} uncompleted tasks`);

			projectsWithTasks.push({ project, tasks: uncompletedTasks });
			for (const task of uncompletedTasks) {
				allTasks.push({ ...task, projectPath: project.path });
			}
		} catch (error) {
			console.error(`  - Error fetching project ${project.path}:`, error);
		}
	}

	const outPath = (name: string) => join(outputDir, name);

	await Bun.write(outPath('projects.json'), JSON.stringify(projectsWithPath, null, 2));
	console.log('\nSaved projects to projects.json');

	await Bun.write(outPath('all-tasks.json'), JSON.stringify(allTasks, null, 2));
	console.log(`Saved ${allTasks.length} uncompleted tasks to all-tasks.json`);

	await Bun.write(outPath('tasks-by-project.json'), JSON.stringify(projectsWithTasks, null, 2));
	console.log('Saved tasks organized by project to tasks-by-project.json');

	const groupsSummary: Record<string, string[]> = {};
	for (const [groupId, groupName] of Object.entries(GROUP_NAMES)) {
		groupsSummary[groupName] = projectsWithPath.filter((p) => p.groupId === groupId).map((p) => p.name);
	}

	const summary = {
		fetchedAt: new Date().toISOString(),
		totalProjects: projectsWithTasks.length,
		totalUncompletedTasks: allTasks.length,
		groups: groupsSummary,
		inboxId: inboxId ?? null,
		tasksByProject: projectsWithTasks.map((p) => ({
			projectPath: p.project.path,
			projectId: p.project.id,
			taskCount: p.tasks.length,
		})),
	};

	await Bun.write(outPath('summary.json'), JSON.stringify(summary, null, 2));
	console.log('Saved summary to summary.json');

	console.log('\n=== Summary ===');
	console.log(`Total projects: ${projectsWithTasks.length}`);
	console.log(`Total uncompleted tasks: ${allTasks.length}`);

	if (Object.keys(groupsSummary).length > 0) {
		console.log('\nGroups:');
		for (const [groupName, projectNames] of Object.entries(groupsSummary)) {
			console.log(`  ${groupName}/: ${projectNames.join(', ')}`);
		}
	}

	console.log('\nTasks by project:');
	for (const p of projectsWithTasks) {
		if (p.tasks.length > 0) {
			console.log(`  - ${p.project.path}: ${p.tasks.length} tasks`);
		}
	}
}

main().catch(console.error);
