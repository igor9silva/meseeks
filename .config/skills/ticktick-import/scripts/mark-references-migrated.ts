#!/usr/bin/env bun

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { Database } from 'bun:sqlite';
import { z } from 'zod';

const tickTickDbPath = `${process.env.HOME ?? ''}/Library/Group Containers/75TY9UT8AY.com.TickTick.task.mac/OSXCoreDataObjC.storedata`;
const tickTickApiBaseUrl = 'https://api.ticktick.com/api/v2';
const referencesDir = resolve('private/tasks/references');
const defaultSummaryFile = '/private/tmp/ticktick-references-migrated.json';

const argsSchema = z.object({
	apply: z.boolean(),
	dbPath: z.string().min(1),
	limit: z.number().int().positive().nullable(),
	projectName: z.string().min(1),
	referencesDir: z.string().min(1),
	summaryFile: z.string().min(1),
	timestamp: z.string().datetime(),
});

const userRowSchema = z.object({
	accessToken: z.string().min(1),
	clientId: z.string().min(1),
});

const projectRowSchema = z.object({
	projectId: z.string().min(1),
	projectName: z.string().min(1),
});

const referenceTaskRowSchema = z.object({
	taskId: z.string().min(1),
	projectId: z.string().min(1),
	title: z.string(),
	content: z.string(),
	description: z.string(),
	status: z.number().int(),
	deletionStatus: z.number().int(),
	priority: z.number().int(),
});

const statusCountSchema = z.object({
	status: z.number().int(),
	deletionStatus: z.number().int(),
	count: z.number().int(),
});

const summaryRowSchema = z.object({
	action: z.enum(['would-update', 'updated', 'skipped-not-imported', 'failed']),
	taskId: z.string().min(1),
	title: z.string(),
	status: z.number().int(),
	error: z.string().nullable(),
});

const summarySchema = z.object({
	apply: z.boolean(),
	project: projectRowSchema,
	timestamp: z.string().datetime(),
	beforeCounts: statusCountSchema.array(),
	afterCounts: statusCountSchema.array().nullable(),
	openRows: z.number().int(),
	importedTaskIds: z.number().int(),
	targetedRows: z.number().int(),
	updatedRows: z.number().int(),
	failedRows: z.number().int(),
	skippedRows: z.number().int(),
	rows: summaryRowSchema.array(),
});

type Args = z.infer<typeof argsSchema>;
type UserRow = z.infer<typeof userRowSchema>;
type ProjectRow = z.infer<typeof projectRowSchema>;
type ReferenceTaskRow = z.infer<typeof referenceTaskRowSchema>;
type SummaryRow = z.infer<typeof summaryRowSchema>;

function parseArgs(rawArgs: string[]) {
	//
	const dbPathIndex = rawArgs.indexOf('--db-path');
	const referencesDirIndex = rawArgs.indexOf('--references-dir');
	const summaryFileIndex = rawArgs.indexOf('--summary-file');
	const timestampIndex = rawArgs.indexOf('--timestamp');
	const limitIndex = rawArgs.indexOf('--limit');
	const projectNameIndex = rawArgs.indexOf('--project-name');
	const rawLimit = limitIndex === -1 ? null : Number(rawArgs[limitIndex + 1] ?? '');

	return argsSchema.parse({
		apply: rawArgs.includes('--apply'),
		dbPath: dbPathIndex === -1 ? tickTickDbPath : resolve(rawArgs[dbPathIndex + 1] ?? tickTickDbPath),
		limit: rawLimit === null ? null : rawLimit,
		projectName: projectNameIndex === -1 ? 'References' : rawArgs[projectNameIndex + 1],
		referencesDir:
			referencesDirIndex === -1 ? referencesDir : resolve(rawArgs[referencesDirIndex + 1] ?? referencesDir),
		summaryFile:
			summaryFileIndex === -1 ? defaultSummaryFile : resolve(rawArgs[summaryFileIndex + 1] ?? defaultSummaryFile),
		timestamp: timestampIndex === -1 ? new Date().toISOString() : rawArgs[timestampIndex + 1],
	});
}

function getActiveUser(database: Database) {
	//
	const row = database
		.query(`
			SELECT
				COALESCE(ZACCESSTOKEN, '') AS accessToken,
				COALESCE(ZCLIENTID, '') AS clientId
			FROM ZTTUSER
			WHERE ZACTIVE = 1
			ORDER BY ZLASTLOGINDATE DESC
			LIMIT 1
		`)
		.get();

	return userRowSchema.parse(row);
}

function getProjectByName(database: Database, projectName: string) {
	//
	const row = database
		.query(`
			SELECT
				COALESCE(ZENTITYID, '') AS projectId,
				COALESCE(ZNAME, '') AS projectName
			FROM ZTTPROJECT
			WHERE lower(COALESCE(ZNAME, '')) = ?
			ORDER BY ZLASTMODIFIEDDATE DESC
			LIMIT 1
		`)
		.get(projectName.toLowerCase());

	return projectRowSchema.parse(row);
}

function getProjectStatusCounts(database: Database, projectId: string) {
	//
	const rows = database
		.query(`
			SELECT
				COALESCE(ZSTATUS, 0) AS status,
				COALESCE(ZDELETIONSTATUS, 0) AS deletionStatus,
				COUNT(*) AS count
			FROM ZTTTASK
			WHERE ZPROJECTID = ?
			GROUP BY COALESCE(ZSTATUS, 0), COALESCE(ZDELETIONSTATUS, 0)
			ORDER BY status, deletionStatus
		`)
		.all(projectId);

	return statusCountSchema.array().parse(rows);
}

function getOpenProjectTasks(database: Database, projectId: string) {
	//
	const rows = database
		.query(`
			SELECT
				COALESCE(ZENTITYID, '') AS taskId,
				COALESCE(ZPROJECTID, '') AS projectId,
				COALESCE(ZTITLE, '') AS title,
				COALESCE(ZCONTENT, '') AS content,
				COALESCE(ZDEZCRIPTION, '') AS description,
				COALESCE(ZSTATUS, 0) AS status,
				COALESCE(ZDELETIONSTATUS, 0) AS deletionStatus,
				COALESCE(ZPRIORITY, 0) AS priority
			FROM ZTTTASK
			WHERE ZPROJECTID = ?
				AND COALESCE(ZSTATUS, 0) = 0
				AND COALESCE(ZDELETIONSTATUS, 0) = 0
			ORDER BY ZSORTORDER ASC, ZLASTMODIFIEDDATE DESC
		`)
		.all(projectId);

	return referenceTaskRowSchema.array().parse(rows);
}

function collectTaskFiles(directoryPath: string, filePaths: string[]): void {
	//
	if (!existsSync(directoryPath)) return;

	const entries = readdirSync(directoryPath, { withFileTypes: true });

	for (const entry of entries) {
		const absolutePath = join(directoryPath, entry.name);

		if (entry.isDirectory()) {
			collectTaskFiles(absolutePath, filePaths);
			continue;
		}

		if (!entry.isFile()) continue;

		const extension = extname(entry.name).toLowerCase();
		if (extension !== '.md' && extension !== '.mdx') continue;

		filePaths.push(absolutePath);
	}
}

function loadImportedTaskIds(directoryPath: string) {
	//
	const filePaths: string[] = [];
	const taskIds = new Set<string>();
	const taskIdPattern = /"taskId"\s*:\s*"([^"]+)"/g;

	collectTaskFiles(directoryPath, filePaths);

	for (const filePath of filePaths) {
		const fileContent = readFileSync(filePath, 'utf-8');

		for (const match of fileContent.matchAll(taskIdPattern)) {
			const taskId = match[1];
			if (!taskId) continue;
			taskIds.add(taskId);
		}
	}

	return taskIds;
}

function createApiHeaders(user: UserRow) {
	//
	return {
		'Cookie': `t=${user.accessToken}`,
		'X-Device': user.clientId,
		'Content-Type': 'application/json',
	};
}

function buildMigratedContent(content: string, timestamp: string) {
	//
	const marker = `Migrated into git: ${timestamp}`;
	const markerPattern = /^Migrated into git: .+$/m;

	if (markerPattern.test(content)) {
		return content.replace(markerPattern, marker);
	}

	if (content.trim().length === 0) return marker;

	return `${content.trimEnd()}\n\n${marker}`;
}

async function markTaskMigrated(user: UserRow, task: ReferenceTaskRow, timestamp: string) {
	//
	const response = await fetch(`${tickTickApiBaseUrl}/task/${task.taskId}`, {
		method: 'PUT',
		headers: createApiHeaders(user),
		body: JSON.stringify({
			id: task.taskId,
			projectId: task.projectId,
			title: task.title,
			content: buildMigratedContent(task.content, timestamp),
			desc: task.description,
			priority: task.priority,
			status: -1,
		}),
	});

	const responseText = await response.text();

	if (!response.ok) {
		throw new Error(`${response.status} ${responseText.slice(0, 400)}`);
	}
}

function maybeApplyLimit<T>(values: T[], limit: number | null): T[] {
	//
	if (limit === null) return values;

	return values.slice(0, limit);
}

async function main() {
	//
	const args = parseArgs(process.argv.slice(2));
	const database = new Database(args.dbPath, { readonly: true });
	const project = getProjectByName(database, args.projectName);
	const beforeCounts = getProjectStatusCounts(database, project.projectId);
	const openTasks = getOpenProjectTasks(database, project.projectId);
	const importedTaskIds = loadImportedTaskIds(args.referencesDir);
	const matchingTasks = maybeApplyLimit(
		openTasks.filter((task) => importedTaskIds.has(task.taskId)),
		args.limit,
	);
	const skippedTasks = openTasks.filter((task) => !importedTaskIds.has(task.taskId));
	const rows: SummaryRow[] = [];
	const user = args.apply ? getActiveUser(database) : null;

	for (const task of skippedTasks) {
		rows.push({
			action: 'skipped-not-imported',
			taskId: task.taskId,
			title: task.title,
			status: task.status,
			error: null,
		});
	}

	for (const task of matchingTasks) {
		if (!args.apply) {
			rows.push({
				action: 'would-update',
				taskId: task.taskId,
				title: task.title,
				status: task.status,
				error: null,
			});
			continue;
		}

		if (user === null) throw new Error('missing active TickTick user');

		try {
			await markTaskMigrated(user, task, args.timestamp);
			rows.push({
				action: 'updated',
				taskId: task.taskId,
				title: task.title,
				status: task.status,
				error: null,
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : 'unknown TickTick API failure';
			rows.push({
				action: 'failed',
				taskId: task.taskId,
				title: task.title,
				status: task.status,
				error: message,
			});
		}
	}

	const afterCounts = args.apply ? getProjectStatusCounts(database, project.projectId) : null;
	const updatedRows = rows.filter((row) => row.action === 'updated').length;
	const failedRows = rows.filter((row) => row.action === 'failed').length;
	const skippedRows = rows.filter((row) => row.action === 'skipped-not-imported').length;
	const summary = summarySchema.parse({
		apply: args.apply,
		project,
		timestamp: args.timestamp,
		beforeCounts,
		afterCounts,
		openRows: openTasks.length,
		importedTaskIds: importedTaskIds.size,
		targetedRows: matchingTasks.length,
		updatedRows,
		failedRows,
		skippedRows,
		rows,
	});

	mkdirSync(dirname(args.summaryFile), { recursive: true });
	writeFileSync(args.summaryFile, `${JSON.stringify(summary, null, 2)}\n`, 'utf-8');

	console.info(JSON.stringify(summary, null, 2));
	console.info(`summary: ${relative(process.cwd(), args.summaryFile)}`);

	if (failedRows > 0) process.exitCode = 1;
}

await main();
