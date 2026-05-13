#!/usr/bin/env bun

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { Database } from 'bun:sqlite';
import { z } from 'zod';

const tickTickDbPath = `${process.env.HOME ?? ''}/Library/Group Containers/75TY9UT8AY.com.TickTick.task.mac/OSXCoreDataObjC.storedata`;
const tickTickApiBaseUrl = 'https://api.ticktick.com/api/v2';
const meseeksProjectId = '66b35a9a617f11216a574648';
const defaultBackupRoot = resolve('private/tasks/.ticktick-migration-backups');
const taskRoots = [resolve('tasks'), resolve('private/tasks')];

const argsSchema = z.object({
	apply: z.boolean(),
	backupDir: z.string().min(1),
	dbPath: z.string().min(1),
	limit: z.number().int().positive().nullable(),
	timestamp: z.string().datetime(),
});

const userRowSchema = z.object({
	accessToken: z.string().min(1),
	clientId: z.string().min(1),
});

const projectRowSchema = z.object({
	pk: z.number().int(),
	projectId: z.string().min(1),
	projectName: z.string().min(1),
});

const statusCountSchema = z.object({
	status: z.number().int(),
	deletionStatus: z.number().int(),
	count: z.number().int(),
});

const openTaskRowSchema = z.object({
	taskId: z.string().min(1),
	parentId: z.string(),
	projectId: z.string().min(1),
	title: z.string(),
	content: z.string(),
	description: z.string(),
	columnId: z.string(),
	columnName: z.string(),
	status: z.number().int(),
	deletionStatus: z.number().int(),
	priority: z.number().int(),
	commentCount: z.number().int(),
	tagString: z.string(),
	startDate: z.number(),
	endDate: z.number(),
	repeatRule: z.string(),
});

const attachmentRowSchema = z.object({
	taskId: z.string().min(1),
	attachmentId: z.string().min(1),
	filename: z.string(),
	localFilePath: z.string(),
	fileSize: z.number().int(),
});

const checklistItemRowSchema = z.object({
	taskId: z.string().min(1),
	itemId: z.string().min(1),
	title: z.string(),
	status: z.number().int().nullable(),
});

const reminderRowSchema = z.object({
	taskId: z.string().min(1),
	reminderId: z.string().min(1),
});

const countRowSchema = z.object({
	count: z.number().int(),
});

const localPayloadSchema = z
	.object({
		tickTick: z
			.object({
				taskId: z.string().min(1),
			})
			.passthrough(),
		children: z
			.object({
				taskId: z.string().min(1),
			})
			.passthrough()
			.array()
			.default([]),
		attachments: z
			.object({
				taskId: z.string().min(1),
				entityId: z.string().min(1),
				importedRelativePath: z.string().min(1),
			})
			.passthrough()
			.array()
			.default([]),
	})
	.passthrough();

const localAttachmentCheckSchema = z.object({
	taskId: z.string().min(1),
	attachmentId: z.string().min(1),
	filePath: z.string().min(1),
	exists: z.boolean(),
});

const apiTaskSchema = z
	.object({
		id: z.string().min(1),
		projectId: z.string().min(1),
		sortOrder: z.number().optional(),
		title: z.string().default(''),
		content: z.string().default(''),
		desc: z.string().default(''),
		timeZone: z.string().optional(),
		isFloating: z.boolean().optional(),
		isAllDay: z.boolean().optional(),
		reminder: z.string().optional(),
		reminders: z.unknown().array().optional(),
		exDate: z.unknown().array().optional(),
		priority: z.number().int().default(0),
		status: z.number().int(),
		items: z.unknown().array().optional(),
		progress: z.number().optional(),
		columnId: z.string().optional(),
		kind: z.string().optional(),
		imgMode: z.number().int().optional(),
		attachments: z.unknown().array().optional(),
		commentCount: z.number().int().optional(),
		deleted: z.number().int().optional(),
	})
	.passthrough();

const apiBackupRowSchema = z.object({
	taskId: z.string().min(1),
	apiTask: apiTaskSchema,
});

const updatePayloadSchema = z.object({
	id: z.string().min(1),
	projectId: z.string().min(1),
	sortOrder: z.number().optional(),
	title: z.string(),
	content: z.string(),
	desc: z.string(),
	timeZone: z.string().optional(),
	isFloating: z.boolean().optional(),
	isAllDay: z.boolean().optional(),
	reminder: z.string().optional(),
	reminders: z.unknown().array().optional(),
	exDate: z.unknown().array().optional(),
	priority: z.number().int(),
	status: z.literal(-1),
	items: z.unknown().array().optional(),
	progress: z.number().optional(),
	columnId: z.string().optional(),
	kind: z.string().optional(),
	imgMode: z.number().int().optional(),
});

const updatePayloadRowSchema = z.object({
	taskId: z.string().min(1),
	payload: updatePayloadSchema,
});

const resultRowSchema = z.object({
	taskId: z.string().min(1),
	title: z.string(),
	action: z.enum(['would-update', 'updated', 'failed']),
	error: z.string().nullable(),
	verificationIssues: z.string().array(),
});

const preflightSchema = z.object({
	project: projectRowSchema,
	beforeCounts: statusCountSchema.array(),
	openRows: z.number().int(),
	targetRows: z.number().int(),
	localMeseeksTaskFiles: z.number().int(),
	importedTaskIds: z.number().int(),
	missingImportedRows: z
		.object({
			taskId: z.string().min(1),
			title: z.string(),
			parentId: z.string(),
		})
		.array(),
	attachments: z.object({
		tickTickRows: z.number().int(),
		localMetadataRows: z.number().int(),
		missingLocalFiles: localAttachmentCheckSchema.array(),
		tickTickRowsMissingInLocalMetadata: attachmentRowSchema.array(),
	}),
	rowsWithComments: openTaskRowSchema.array(),
	reminders: reminderRowSchema.array(),
	checklistItems: checklistItemRowSchema.array(),
	rowsWithDates: openTaskRowSchema.array(),
	rowsWithRepeat: openTaskRowSchema.array(),
	rowsWithTickTickTags: openTaskRowSchema.array(),
	orphanChildren: openTaskRowSchema.array(),
	columnCounts: z.record(z.string(), z.number().int()),
	blockers: z.string().array(),
	warnings: z.string().array(),
});

const summarySchema = z.object({
	apply: z.boolean(),
	timestamp: z.string().datetime(),
	backupDir: z.string().min(1),
	preflight: preflightSchema,
	afterCounts: statusCountSchema.array().nullable(),
	apiBeforeRows: z.number().int(),
	apiAfterRows: z.number().int(),
	updatedRows: z.number().int(),
	failedRows: z.number().int(),
	verificationIssueRows: z.number().int(),
	results: resultRowSchema.array(),
});

type Args = z.infer<typeof argsSchema>;
type UserRow = z.infer<typeof userRowSchema>;
type OpenTaskRow = z.infer<typeof openTaskRowSchema>;
type AttachmentRow = z.infer<typeof attachmentRowSchema>;
type LocalAttachmentCheck = z.infer<typeof localAttachmentCheckSchema>;
type ApiTask = z.infer<typeof apiTaskSchema>;
type ApiBackupRow = z.infer<typeof apiBackupRowSchema>;
type UpdatePayload = z.infer<typeof updatePayloadSchema>;
type UpdatePayloadRow = z.infer<typeof updatePayloadRowSchema>;
type ResultRow = z.infer<typeof resultRowSchema>;

function parseArgs(rawArgs: string[]) {
	//
	const dbPathIndex = rawArgs.indexOf('--db-path');
	const backupDirIndex = rawArgs.indexOf('--backup-dir');
	const timestampIndex = rawArgs.indexOf('--timestamp');
	const limitIndex = rawArgs.indexOf('--limit');
	const timestamp = timestampIndex === -1 ? new Date().toISOString() : (rawArgs[timestampIndex + 1] ?? '');
	const timestampSlug = timestamp.replace(/[:.]/g, '-');
	const rawLimit = limitIndex === -1 ? null : Number(rawArgs[limitIndex + 1] ?? '');

	return argsSchema.parse({
		apply: rawArgs.includes('--apply'),
		backupDir:
			backupDirIndex === -1
				? join(defaultBackupRoot, `meseeks-${timestampSlug}`)
				: resolve(rawArgs[backupDirIndex + 1] ?? defaultBackupRoot),
		dbPath: dbPathIndex === -1 ? tickTickDbPath : resolve(rawArgs[dbPathIndex + 1] ?? tickTickDbPath),
		limit: rawLimit === null ? null : rawLimit,
		timestamp,
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

function getProject(database: Database) {
	//
	const row = database
		.query(`
			SELECT
				Z_PK AS pk,
				COALESCE(ZENTITYID, '') AS projectId,
				COALESCE(ZNAME, '') AS projectName
			FROM ZTTPROJECT
			WHERE ZENTITYID = ?
			LIMIT 1
		`)
		.get(meseeksProjectId);

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

function getOpenTasks(database: Database, projectId: string) {
	//
	const rows = database
		.query(`
			SELECT
				COALESCE(t.ZENTITYID, '') AS taskId,
				COALESCE(t.ZPARENTID, '') AS parentId,
				COALESCE(t.ZPROJECTID, '') AS projectId,
				COALESCE(t.ZTITLE, '') AS title,
				COALESCE(t.ZCONTENT, '') AS content,
				COALESCE(t.ZDEZCRIPTION, '') AS description,
				COALESCE(t.ZCOLUMNID, '') AS columnId,
				COALESCE(c.ZNAME, '') AS columnName,
				COALESCE(t.ZSTATUS, 0) AS status,
				COALESCE(t.ZDELETIONSTATUS, 0) AS deletionStatus,
				COALESCE(t.ZPRIORITY, 0) AS priority,
				COALESCE(t.ZCOMMENTCOUNT, 0) AS commentCount,
				COALESCE(t.ZSTRINGOFTAGS, '') AS tagString,
				COALESCE(t.ZSTARTDATE, 0) AS startDate,
				COALESCE(t.ZENDDATE, 0) AS endDate,
				COALESCE(t.ZREPEATRULE, '') AS repeatRule
			FROM ZTTTASK t
			LEFT JOIN ZTTCOLUMN c ON t.ZCOLUMN = c.Z_PK
			WHERE COALESCE(t.ZPROJECTID, '') = ?
				AND COALESCE(t.ZSTATUS, 0) = 0
				AND COALESCE(t.ZDELETIONSTATUS, 0) = 0
			ORDER BY t.ZSORTORDER ASC, t.ZLASTMODIFIEDDATE DESC
		`)
		.all(projectId);

	return openTaskRowSchema.array().parse(rows);
}

function getAttachments(database: Database, projectId: string) {
	//
	const rows = database
		.query(`
			SELECT
				COALESCE(t.ZENTITYID, a.ZTASKID, '') AS taskId,
				COALESCE(a.ZENTITYID, '') AS attachmentId,
				COALESCE(a.ZFILENAME, '') AS filename,
				COALESCE(a.ZLOCALFILEPATH, '') AS localFilePath,
				COALESCE(a.ZFILESIZE, 0) AS fileSize
			FROM ZTTATTACHMENT a
			LEFT JOIN ZTTTASK t ON a.ZTASK = t.Z_PK
			WHERE COALESCE(t.ZPROJECTID, '') = ?
				AND COALESCE(t.ZSTATUS, 0) = 0
				AND COALESCE(t.ZDELETIONSTATUS, 0) = 0
			ORDER BY a.ZCREATIONDATE ASC
		`)
		.all(projectId);

	return attachmentRowSchema.array().parse(rows);
}

function getChecklistItems(database: Database, projectId: string) {
	//
	const rows = database
		.query(`
			SELECT
				COALESCE(t.ZENTITYID, '') AS taskId,
				COALESCE(ci.ZENTITYID, '') AS itemId,
				COALESCE(ci.ZTITLE, '') AS title,
				ci.ZSTATUS AS status
			FROM ZTTCHECKLISTITEM ci
			LEFT JOIN ZTTTASK t ON ci.ZTASK = t.Z_PK
			WHERE COALESCE(t.ZPROJECTID, '') = ?
				AND COALESCE(t.ZSTATUS, 0) = 0
				AND COALESCE(t.ZDELETIONSTATUS, 0) = 0
			ORDER BY ci.ZSORTORDER ASC
		`)
		.all(projectId);

	return checklistItemRowSchema.array().parse(rows);
}

function getReminders(database: Database, projectId: string) {
	//
	const rows = database
		.query(`
			SELECT
				COALESCE(t.ZENTITYID, '') AS taskId,
				COALESCE(r.ZENTITYID, '') AS reminderId
			FROM ZTTREMINDER r
			LEFT JOIN ZTTTASK t ON r.ZTASK = t.Z_PK
			WHERE COALESCE(t.ZPROJECTID, '') = ?
				AND COALESCE(t.ZSTATUS, 0) = 0
				AND COALESCE(t.ZDELETIONSTATUS, 0) = 0
			ORDER BY r.Z_PK ASC
		`)
		.all(projectId);

	return reminderRowSchema.array().parse(rows);
}

function getDeletionFlaggedOpenCount(database: Database, projectId: string) {
	//
	const row = database
		.query(`
			SELECT COUNT(*) AS count
			FROM ZTTTASK
			WHERE COALESCE(ZPROJECTID, '') = ?
				AND COALESCE(ZSTATUS, 0) = 0
				AND COALESCE(ZDELETIONSTATUS, 0) != 0
		`)
		.get(projectId);

	return countRowSchema.parse(row).count;
}

function collectTaskFiles(root: string): string[] {
	//
	if (!existsSync(root)) return [];

	const filePaths: string[] = [];
	const entries = readdirSync(root, { withFileTypes: true });

	for (const entry of entries) {
		const entryPath = join(root, entry.name);

		if (entry.isDirectory()) {
			filePaths.push(...collectTaskFiles(entryPath));
			continue;
		}

		if (!entry.isFile()) continue;

		const extension = extname(entry.name).toLowerCase();
		if (extension !== '.md' && extension !== '.mdx') continue;

		filePaths.push(entryPath);
	}

	return filePaths;
}

function parsePayload(fileContent: string) {
	//
	const match = fileContent.match(/```json\n([\s\S]*?)\n```/);
	if (!match?.[1]) return null;

	try {
		return localPayloadSchema.parse(JSON.parse(match[1]));
	} catch {
		return null;
	}
}

function loadLocalMeseeksImport() {
	//
	const importedTaskIds = new Map<string, string>();
	const localAttachmentChecks: LocalAttachmentCheck[] = [];
	let localMeseeksTaskFiles = 0;

	for (const root of taskRoots) {
		for (const filePath of collectTaskFiles(root)) {
			const content = readFileSync(filePath, 'utf-8');
			if (!content.includes('ticktick-list:meseeks')) continue;

			const payload = parsePayload(content);
			if (!payload) continue;

			localMeseeksTaskFiles += 1;
			importedTaskIds.set(payload.tickTick.taskId, filePath);

			for (const child of payload.children) {
				importedTaskIds.set(child.taskId, filePath);
			}

			for (const attachment of payload.attachments) {
				const attachmentPath = join(dirname(filePath), attachment.importedRelativePath);
				localAttachmentChecks.push(
					localAttachmentCheckSchema.parse({
						taskId: attachment.taskId,
						attachmentId: attachment.entityId,
						filePath: attachmentPath,
						exists: existsSync(attachmentPath),
					}),
				);
			}
		}
	}

	return {
		importedTaskIds,
		localAttachmentChecks,
		localMeseeksTaskFiles,
	};
}

function countColumns(tasks: OpenTaskRow[]) {
	//
	const columnCounts: Record<string, number> = {};

	for (const task of tasks) {
		const columnName = task.columnName || '(none)';
		columnCounts[columnName] = (columnCounts[columnName] ?? 0) + 1;
	}

	return Object.fromEntries(Object.entries(columnCounts).sort(([left], [right]) => left.localeCompare(right)));
}

function createPreflight(database: Database, args: Args) {
	//
	const project = getProject(database);
	const beforeCounts = getProjectStatusCounts(database, project.projectId);
	const openTasks = getOpenTasks(database, project.projectId);
	const targetTasks = args.limit === null ? openTasks : openTasks.slice(0, args.limit);
	const attachments = getAttachments(database, project.projectId);
	const checklistItems = getChecklistItems(database, project.projectId);
	const reminders = getReminders(database, project.projectId);
	const localImport = loadLocalMeseeksImport();
	const importedAttachmentIds = new Set(
		localImport.localAttachmentChecks.map((attachment) => attachment.attachmentId),
	);
	const openTaskIds = new Set(openTasks.map((task) => task.taskId));
	const missingImportedRows = openTasks
		.filter((task) => !localImport.importedTaskIds.has(task.taskId))
		.map((task) => ({
			taskId: task.taskId,
			title: task.title,
			parentId: task.parentId,
		}));
	const attachmentRowsMissingInLocalMetadata = attachments.filter(
		(attachment) => !importedAttachmentIds.has(attachment.attachmentId),
	);
	const missingLocalFiles = localImport.localAttachmentChecks.filter((attachment) => !attachment.exists);
	const rowsWithComments = openTasks.filter((task) => task.commentCount > 0);
	const rowsWithDates = openTasks.filter((task) => task.startDate > 0 || task.endDate > 0);
	const rowsWithRepeat = openTasks.filter((task) => task.repeatRule.length > 0);
	const rowsWithTickTickTags = openTasks.filter((task) => task.tagString.trim().length > 0);
	const orphanChildren = openTasks.filter((task) => task.parentId.length > 0 && !openTaskIds.has(task.parentId));
	const deletionFlaggedOpenCount = getDeletionFlaggedOpenCount(database, project.projectId);
	const blockers: string[] = [];
	const warnings: string[] = [];

	if (missingImportedRows.length > 0) {
		blockers.push(`${missingImportedRows.length} open TickTick rows are missing from local git imports.`);
	}

	if (attachmentRowsMissingInLocalMetadata.length > 0) {
		blockers.push(
			`${attachmentRowsMissingInLocalMetadata.length} TickTick attachment rows are missing local metadata.`,
		);
	}

	if (missingLocalFiles.length > 0) {
		blockers.push(`${missingLocalFiles.length} imported attachment files are missing on disk.`);
	}

	if (rowsWithComments.length > 0) {
		blockers.push(`${rowsWithComments.length} open TickTick rows have comments that are not safely handled here.`);
	}

	if (checklistItems.length > 0) {
		blockers.push(`${checklistItems.length} checklist items need explicit review before marking migrated.`);
	}

	if (reminders.length > 0) {
		blockers.push(`${reminders.length} reminders need explicit review before marking migrated.`);
	}

	if (rowsWithDates.length > 0) {
		warnings.push(`${rowsWithDates.length} open rows have start/end dates preserved in local JSON and API backup.`);
	}

	if (rowsWithRepeat.length > 0) {
		warnings.push(`${rowsWithRepeat.length} open rows have repeat rules preserved in local JSON and API backup.`);
	}

	if (rowsWithTickTickTags.length > 0) {
		warnings.push(
			`${rowsWithTickTickTags.length} open rows have native TickTick tags preserved in local JSON and API backup.`,
		);
	}

	if (orphanChildren.length > 0) {
		warnings.push(
			`${orphanChildren.length} open child rows have a parent that is not currently open; they are imported locally as standalone tasks.`,
		);
	}

	if (deletionFlaggedOpenCount > 0) {
		warnings.push(`${deletionFlaggedOpenCount} open rows are deletion-flagged and intentionally not targeted.`);
	}

	return preflightSchema.parse({
		project,
		beforeCounts,
		openRows: openTasks.length,
		targetRows: targetTasks.length,
		localMeseeksTaskFiles: localImport.localMeseeksTaskFiles,
		importedTaskIds: localImport.importedTaskIds.size,
		missingImportedRows,
		attachments: {
			tickTickRows: attachments.length,
			localMetadataRows: localImport.localAttachmentChecks.length,
			missingLocalFiles,
			tickTickRowsMissingInLocalMetadata: attachmentRowsMissingInLocalMetadata,
		},
		rowsWithComments,
		reminders,
		checklistItems,
		rowsWithDates,
		rowsWithRepeat,
		rowsWithTickTickTags,
		orphanChildren,
		columnCounts: countColumns(openTasks),
		blockers,
		warnings,
	});
}

function createApiHeaders(user: UserRow) {
	//
	return {
		'Cookie': `t=${user.accessToken}`,
		'X-Device': user.clientId,
		'Content-Type': 'application/json',
	};
}

async function fetchApiTask(user: UserRow, taskId: string) {
	//
	const response = await fetch(`${tickTickApiBaseUrl}/task/${taskId}`, {
		headers: createApiHeaders(user),
	});
	const text = await response.text();

	if (!response.ok) {
		throw new Error(`Failed to fetch ${taskId}: ${response.status} ${text.slice(0, 400)}`);
	}

	return apiTaskSchema.parse(JSON.parse(text));
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

function buildUpdatePayload(apiTask: ApiTask, timestamp: string) {
	//
	return updatePayloadSchema.parse({
		id: apiTask.id,
		projectId: apiTask.projectId,
		sortOrder: apiTask.sortOrder,
		title: apiTask.title,
		content: buildMigratedContent(apiTask.content, timestamp),
		desc: apiTask.desc,
		timeZone: apiTask.timeZone,
		isFloating: apiTask.isFloating,
		isAllDay: apiTask.isAllDay,
		reminder: apiTask.reminder,
		reminders: apiTask.reminders,
		exDate: apiTask.exDate,
		priority: apiTask.priority,
		status: -1,
		items: apiTask.items,
		progress: apiTask.progress,
		columnId: apiTask.columnId,
		kind: apiTask.kind,
		imgMode: apiTask.imgMode,
	});
}

async function updateApiTask(user: UserRow, taskId: string, payload: UpdatePayload) {
	//
	const response = await fetch(`${tickTickApiBaseUrl}/task/${taskId}`, {
		method: 'PUT',
		headers: createApiHeaders(user),
		body: JSON.stringify(payload),
	});
	const text = await response.text();

	if (!response.ok) {
		throw new Error(`Failed to update ${taskId}: ${response.status} ${text.slice(0, 400)}`);
	}
}

function verifyApiTask(before: ApiTask, after: ApiTask, timestamp: string) {
	//
	const issues: string[] = [];
	const expectedContent = buildMigratedContent(before.content, timestamp);

	if (after.status !== -1) issues.push(`status is ${after.status}, expected -1`);
	if (after.content !== expectedContent) issues.push('content does not match migrated marker update');
	if (after.projectId !== before.projectId) issues.push('projectId changed');
	if (after.title !== before.title) issues.push('title changed');
	if (after.desc !== before.desc) issues.push('desc changed');
	if (after.priority !== before.priority) issues.push('priority changed');
	if (after.columnId !== before.columnId) issues.push('columnId changed');
	if ((after.attachments ?? []).length !== (before.attachments ?? []).length) issues.push('attachment count changed');
	if ((after.items ?? []).length !== (before.items ?? []).length) issues.push('items count changed');
	if ((after.reminders ?? []).length !== (before.reminders ?? []).length) issues.push('reminders count changed');
	if (after.deleted !== before.deleted) issues.push('deleted flag changed');

	return issues;
}

async function mapWithConcurrency<TItem, TResult>(
	items: TItem[],
	concurrency: number,
	callback: (item: TItem) => Promise<TResult>,
) {
	//
	const results: TResult[] = [];
	let nextIndex = 0;

	async function worker() {
		//
		while (nextIndex < items.length) {
			const item = items[nextIndex];
			nextIndex += 1;
			if (!item) continue;

			results.push(await callback(item));
		}
	}

	const workers = Array.from({ length: Math.min(concurrency, items.length) }, worker);
	await Promise.all(workers);

	return results;
}

function writeJson(filePath: string, value: unknown) {
	//
	mkdirSync(dirname(filePath), { recursive: true });
	writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf-8');
}

function buildConsoleSummary(summary: z.infer<typeof summarySchema>) {
	//
	return {
		apply: summary.apply,
		timestamp: summary.timestamp,
		backupDir: summary.backupDir,
		preflight: {
			project: summary.preflight.project,
			beforeCounts: summary.preflight.beforeCounts,
			openRows: summary.preflight.openRows,
			targetRows: summary.preflight.targetRows,
			localMeseeksTaskFiles: summary.preflight.localMeseeksTaskFiles,
			importedTaskIds: summary.preflight.importedTaskIds,
			missingImportedRows: summary.preflight.missingImportedRows.length,
			attachments: {
				tickTickRows: summary.preflight.attachments.tickTickRows,
				localMetadataRows: summary.preflight.attachments.localMetadataRows,
				missingLocalFiles: summary.preflight.attachments.missingLocalFiles.length,
				tickTickRowsMissingInLocalMetadata:
					summary.preflight.attachments.tickTickRowsMissingInLocalMetadata.length,
			},
			rowsWithComments: summary.preflight.rowsWithComments.length,
			reminders: summary.preflight.reminders.length,
			checklistItems: summary.preflight.checklistItems.length,
			rowsWithDates: summary.preflight.rowsWithDates.length,
			rowsWithRepeat: summary.preflight.rowsWithRepeat.length,
			rowsWithTickTickTags: summary.preflight.rowsWithTickTickTags.length,
			orphanChildren: summary.preflight.orphanChildren.length,
			columnCounts: summary.preflight.columnCounts,
			blockers: summary.preflight.blockers,
			warnings: summary.preflight.warnings,
		},
		afterCounts: summary.afterCounts,
		apiBeforeRows: summary.apiBeforeRows,
		apiAfterRows: summary.apiAfterRows,
		updatedRows: summary.updatedRows,
		failedRows: summary.failedRows,
		verificationIssueRows: summary.verificationIssueRows,
		resultRows: summary.results.length,
	};
}

async function main() {
	//
	const args = parseArgs(process.argv.slice(2));
	const database = new Database(args.dbPath, { readonly: true });
	const preflight = createPreflight(database, args);
	const openTasks = getOpenTasks(database, preflight.project.projectId);
	const targetTasks = args.limit === null ? openTasks : openTasks.slice(0, args.limit);
	const results: ResultRow[] = [];
	let apiBeforeRows: ApiBackupRow[] = [];
	let payloadRows: UpdatePayloadRow[] = [];
	let apiAfterRows: ApiBackupRow[] = [];

	writeJson(join(args.backupDir, 'preflight.json'), preflight);

	if (preflight.blockers.length > 0) {
		const summary = summarySchema.parse({
			apply: args.apply,
			timestamp: args.timestamp,
			backupDir: args.backupDir,
			preflight,
			afterCounts: null,
			apiBeforeRows: 0,
			apiAfterRows: 0,
			updatedRows: 0,
			failedRows: 0,
			verificationIssueRows: 0,
			results,
		});
		writeJson(join(args.backupDir, 'summary.json'), summary);
		console.info(JSON.stringify(buildConsoleSummary(summary), null, 2));
		throw new Error(`Refusing to continue: ${preflight.blockers.join(' ')}`);
	}

	if (!args.apply) {
		for (const task of targetTasks) {
			results.push(
				resultRowSchema.parse({
					taskId: task.taskId,
					title: task.title,
					action: 'would-update',
					error: null,
					verificationIssues: [],
				}),
			);
		}

		const summary = summarySchema.parse({
			apply: args.apply,
			timestamp: args.timestamp,
			backupDir: args.backupDir,
			preflight,
			afterCounts: null,
			apiBeforeRows: 0,
			apiAfterRows: 0,
			updatedRows: 0,
			failedRows: 0,
			verificationIssueRows: 0,
			results,
		});
		writeJson(join(args.backupDir, 'summary.json'), summary);
		console.info(JSON.stringify(buildConsoleSummary(summary), null, 2));
		return;
	}

	const user = getActiveUser(database);

	apiBeforeRows = await mapWithConcurrency(targetTasks, 8, async (task) =>
		apiBackupRowSchema.parse({
			taskId: task.taskId,
			apiTask: await fetchApiTask(user, task.taskId),
		}),
	);
	payloadRows = apiBeforeRows.map((row) =>
		updatePayloadRowSchema.parse({
			taskId: row.taskId,
			payload: buildUpdatePayload(row.apiTask, args.timestamp),
		}),
	);

	writeJson(join(args.backupDir, 'api-before.json'), apiBeforeRows);
	writeJson(join(args.backupDir, 'payloads.json'), payloadRows);

	const apiBeforeById = new Map(apiBeforeRows.map((row) => [row.taskId, row.apiTask]));
	const payloadById = new Map(payloadRows.map((row) => [row.taskId, row.payload]));

	for (const task of targetTasks) {
		const payload = payloadById.get(task.taskId);

		if (!payload) {
			results.push(
				resultRowSchema.parse({
					taskId: task.taskId,
					title: task.title,
					action: 'failed',
					error: 'missing update payload',
					verificationIssues: [],
				}),
			);
			continue;
		}

		try {
			await updateApiTask(user, task.taskId, payload);
			results.push(
				resultRowSchema.parse({
					taskId: task.taskId,
					title: task.title,
					action: 'updated',
					error: null,
					verificationIssues: [],
				}),
			);
		} catch (error) {
			results.push(
				resultRowSchema.parse({
					taskId: task.taskId,
					title: task.title,
					action: 'failed',
					error: error instanceof Error ? error.message : 'unknown TickTick API failure',
					verificationIssues: [],
				}),
			);
		}
	}

	apiAfterRows = await mapWithConcurrency(targetTasks, 8, async (task) =>
		apiBackupRowSchema.parse({
			taskId: task.taskId,
			apiTask: await fetchApiTask(user, task.taskId),
		}),
	);
	writeJson(join(args.backupDir, 'api-after.json'), apiAfterRows);

	for (const row of apiAfterRows) {
		const before = apiBeforeById.get(row.taskId);
		const result = results.find((candidate) => candidate.taskId === row.taskId);
		if (!before || !result) continue;

		result.verificationIssues = verifyApiTask(before, row.apiTask, args.timestamp);
	}

	const afterCounts = getProjectStatusCounts(database, preflight.project.projectId);
	const updatedRows = results.filter((row) => row.action === 'updated').length;
	const failedRows = results.filter((row) => row.action === 'failed').length;
	const verificationIssueRows = results.filter((row) => row.verificationIssues.length > 0).length;
	const summary = summarySchema.parse({
		apply: args.apply,
		timestamp: args.timestamp,
		backupDir: args.backupDir,
		preflight,
		afterCounts,
		apiBeforeRows: apiBeforeRows.length,
		apiAfterRows: apiAfterRows.length,
		updatedRows,
		failedRows,
		verificationIssueRows,
		results,
	});

	writeJson(join(args.backupDir, 'summary.json'), summary);
	console.info(JSON.stringify(buildConsoleSummary(summary), null, 2));

	if (failedRows > 0 || verificationIssueRows > 0) process.exitCode = 1;
}

await main();
