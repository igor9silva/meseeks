#!/usr/bin/env bun

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { Database } from 'bun:sqlite';
import { z } from 'zod';

const coreDataUnixOffsetSeconds = 978307200;
const defaultDbPath = `${process.env.HOME ?? ''}/Library/Group Containers/75TY9UT8AY.com.TickTick.task.mac/OSXCoreDataObjC.storedata`;
const defaultAttachmentsRoot = join(dirname(defaultDbPath), 'Attachments');
const defaultSummaryFile = resolve('organize/ticktick-import-2026-05-11.json');
const defaultImportDate = '2026-05-11';
const defaultAllProjectsOutputDir = resolve('private/files/inbox');

const projectConfigs = [
	{
		id: '66b35a9a617f11216a574648',
		label: 'Meseeks',
		outputDir: resolve('private/files/inbox'),
	},
	{
		id: '66b90a03fa0851023612087c',
		label: 'References',
		outputDir: resolve('private/files/references'),
	},
];

const priorityValueSchema = z.enum(['none', 'low', 'medium', 'high', '0', '1', '3', '5']);
const dueDateValueSchema = z.union([z.literal('today'), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]);

const argsSchema = z.object({
	dbPath: z.string(),
	attachmentsRoot: z.string(),
	importDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	summaryFile: z.string(),
	dryRun: z.boolean(),
	overwrite: z.boolean(),
	verbose: z.boolean(),
	allProjects: z.boolean(),
	priority: z.number().int().nullable(),
	dueDate: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.nullable(),
});

const projectRowSchema = z.object({
	pk: z.number().int(),
	entityId: z.string(),
	name: z.string(),
	closed: z.number().nullable(),
	kind: z.string().nullable(),
});

const taskRowSchema = z.object({
	pk: z.number().int(),
	entityId: z.string(),
	parentId: z.string(),
	projectId: z.string(),
	projectName: z.string(),
	columnId: z.string(),
	columnName: z.string(),
	title: z.string(),
	content: z.string(),
	description: z.string(),
	notionBlockString: z.string(),
	status: z.number().int(),
	deletionStatus: z.number().int(),
	priority: z.number().int(),
	progress: z.number().nullable(),
	sortOrder: z.number().nullable(),
	taskType: z.number().nullable(),
	commentCount: z.number().nullable(),
	tagString: z.string(),
	timeZoneName: z.string().nullable(),
	startAt: z.string().nullable(),
	startLocalDate: z.string().nullable(),
	endAt: z.string().nullable(),
	endLocalDate: z.string().nullable(),
	createdAt: z.string().nullable(),
	updatedAt: z.string().nullable(),
	completedAt: z.string().nullable(),
	repeatRule: z.string(),
	repeatFrom: z.string(),
	repeatTaskId: z.string(),
});

const sourceCountSchema = z.object({
	status: z.number().nullable(),
	deletionStatus: z.number().int(),
	count: z.number().int(),
});

const attachmentRowSchema = z.object({
	taskId: z.string(),
	entityId: z.string(),
	filename: z.string(),
	localFilePath: z.string(),
	referencedAttachmentId: z.string(),
	fileSize: z.number().nullable(),
	fileType: z.number().nullable(),
	status: z.number().nullable(),
	createdAt: z.string().nullable(),
	updatedAt: z.string().nullable(),
});

const checklistItemRowSchema = z.object({
	taskId: z.string(),
	entityId: z.string(),
	title: z.string(),
	status: z.number().nullable(),
	sortOrder: z.number().nullable(),
	startAt: z.string().nullable(),
	completedAt: z.string().nullable(),
});

const reminderRowSchema = z.object({
	taskId: z.string(),
	entityId: z.string(),
});

const importedFileSchema = z.object({
	action: z.enum(['created', 'kept']),
	taskId: z.string(),
	filePath: z.string(),
	project: z.string(),
	embeddedChildren: z.number().int(),
	attachments: z.number().int(),
	copiedAttachments: z.number().int(),
	missingAttachments: z.number().int(),
});

const projectSummarySchema = z.object({
	project: z.string(),
	projectId: z.string(),
	outputDir: z.string(),
	sourceCounts: sourceCountSchema.array(),
	openRows: z.number().int(),
	rootRows: z.number().int(),
	embeddedChildRows: z.number().int(),
	orphanChildRows: z.number().int(),
	createdFiles: z.number().int(),
	keptFiles: z.number().int(),
	attachments: z.number().int(),
	copiedAttachments: z.number().int(),
	missingAttachments: z.number().int(),
	checklistItems: z.number().int(),
	reminders: z.number().int(),
});

type Args = z.infer<typeof argsSchema>;
type ProjectRow = z.infer<typeof projectRowSchema>;
type TaskRow = z.infer<typeof taskRowSchema>;
type SourceCount = z.infer<typeof sourceCountSchema>;
type AttachmentRow = z.infer<typeof attachmentRowSchema>;
type ChecklistItemRow = z.infer<typeof checklistItemRowSchema>;
type ReminderRow = z.infer<typeof reminderRowSchema>;
type ImportedFile = z.infer<typeof importedFileSchema>;
type ProjectSummary = z.infer<typeof projectSummarySchema>;

interface ProjectConfig {
	id: string;
	label: string;
	outputDir: string;
}

interface ImportedTask {
	task: TaskRow;
	children: TaskRow[];
	attachments: AttachmentRow[];
	checklistItems: ChecklistItemRow[];
	reminders: ReminderRow[];
}

interface AttachmentImport {
	attachment: AttachmentRow;
	fileName: string;
	relativeLink: string;
	destinationPath: string;
	sourcePath: string | null;
	status: 'copied' | 'missing' | 'dry-run';
}

function localDatePart(value: number) {
	//
	return String(value).padStart(2, '0');
}

function formatLocalDate(date: Date) {
	//
	return `${date.getFullYear()}-${localDatePart(date.getMonth() + 1)}-${localDatePart(date.getDate())}`;
}

function parsePriority(value: string) {
	//
	const parsedValue = priorityValueSchema.parse(value.trim().toLowerCase());

	if (parsedValue === 'none' || parsedValue === '0') return 0;
	if (parsedValue === 'low' || parsedValue === '1') return 1;
	if (parsedValue === 'medium' || parsedValue === '3') return 3;
	return 5;
}

function parseDueDate(value: string) {
	//
	const parsedValue = dueDateValueSchema.parse(value.trim().toLowerCase());
	if (parsedValue === 'today') return formatLocalDate(new Date());
	return parsedValue;
}

function parseArgs(rawArgs: string[]) {
	//
	const dbPathIndex = rawArgs.indexOf('--db-path');
	const attachmentsRootIndex = rawArgs.indexOf('--attachments-root');
	const importDateIndex = rawArgs.indexOf('--import-date');
	const summaryFileIndex = rawArgs.indexOf('--summary-file');
	const priorityIndex = rawArgs.indexOf('--priority');
	const dueDateIndex = rawArgs.indexOf('--due-date');

	return argsSchema.parse({
		dbPath: dbPathIndex === -1 ? defaultDbPath : resolve(rawArgs[dbPathIndex + 1] ?? defaultDbPath),
		attachmentsRoot:
			attachmentsRootIndex === -1
				? defaultAttachmentsRoot
				: resolve(rawArgs[attachmentsRootIndex + 1] ?? defaultAttachmentsRoot),
		importDate: importDateIndex === -1 ? defaultImportDate : (rawArgs[importDateIndex + 1] ?? ''),
		summaryFile:
			summaryFileIndex === -1 ? defaultSummaryFile : resolve(rawArgs[summaryFileIndex + 1] ?? defaultSummaryFile),
		dryRun: rawArgs.includes('--dry-run'),
		overwrite: rawArgs.includes('--overwrite'),
		verbose: rawArgs.includes('--verbose'),
		allProjects: rawArgs.includes('--all-projects'),
		priority: priorityIndex === -1 ? null : parsePriority(rawArgs[priorityIndex + 1] ?? ''),
		dueDate: dueDateIndex === -1 ? null : parseDueDate(rawArgs[dueDateIndex + 1] ?? ''),
	});
}

function queryProjects(database: Database, args: Args) {
	//
	if (args.allProjects) {
		const statement = database.query(`
			SELECT
				Z_PK AS pk,
				COALESCE(ZENTITYID, '') AS entityId,
				COALESCE(ZNAME, '') AS name,
				ZCLOSED AS closed,
				ZKIND AS kind
			FROM ZTTPROJECT
			WHERE COALESCE(ZCLOSED, 0) = 0
			ORDER BY ZNAME ASC
		`);

		return projectRowSchema.array().parse(statement.all());
	}

	const statement = database.query(`
		SELECT
			Z_PK AS pk,
			COALESCE(ZENTITYID, '') AS entityId,
			COALESCE(ZNAME, '') AS name,
			ZCLOSED AS closed,
			ZKIND AS kind
		FROM ZTTPROJECT
		WHERE ZENTITYID IN (${projectConfigs.map(() => '?').join(', ')})
	`);

	return projectRowSchema.array().parse(statement.all(...projectConfigs.map((project) => project.id)));
}

function querySourceCounts(database: Database, projectPk: number) {
	//
	const statement = database.query(`
		SELECT
			ZSTATUS AS status,
			COALESCE(ZDELETIONSTATUS, 0) AS deletionStatus,
			COUNT(*) AS count
		FROM ZTTTASK
		WHERE ZPROJECT = ?
		GROUP BY ZSTATUS, COALESCE(ZDELETIONSTATUS, 0)
		ORDER BY ZSTATUS, deletionStatus
	`);

	return sourceCountSchema.array().parse(statement.all(projectPk));
}

function dateExpression(columnName: string) {
	//
	return `CASE WHEN ${columnName} IS NULL THEN NULL ELSE strftime('%Y-%m-%dT%H:%M:%SZ', ${columnName} + ${coreDataUnixOffsetSeconds}, 'unixepoch') END`;
}

function localDateExpression(columnName: string) {
	//
	return `CASE WHEN ${columnName} IS NULL THEN NULL ELSE strftime('%Y-%m-%d', ${columnName} + ${coreDataUnixOffsetSeconds}, 'unixepoch', 'localtime') END`;
}

function queryOpenTasks(database: Database, projectPk: number) {
	//
	const statement = database.query(`
		SELECT
			t.Z_PK AS pk,
			COALESCE(t.ZENTITYID, '') AS entityId,
			COALESCE(t.ZPARENTID, '') AS parentId,
			COALESCE(t.ZPROJECTID, p.ZENTITYID, '') AS projectId,
			COALESCE(p.ZNAME, '') AS projectName,
			COALESCE(t.ZCOLUMNID, c.ZENTITYID, '') AS columnId,
			COALESCE(c.ZNAME, '') AS columnName,
			COALESCE(t.ZTITLE, '') AS title,
			COALESCE(t.ZCONTENT, '') AS content,
			COALESCE(t.ZDEZCRIPTION, '') AS description,
			COALESCE(t.ZNOTIONBLOCKSTRING, '') AS notionBlockString,
			COALESCE(t.ZSTATUS, 0) AS status,
			COALESCE(t.ZDELETIONSTATUS, 0) AS deletionStatus,
			COALESCE(t.ZPRIORITY, 0) AS priority,
			t.ZPROGRESS AS progress,
			t.ZSORTORDER AS sortOrder,
			t.ZTASKTYPE AS taskType,
			t.ZCOMMENTCOUNT AS commentCount,
			COALESCE(t.ZSTRINGOFTAGS, '') AS tagString,
			t.ZTIMEZONENAME AS timeZoneName,
			${dateExpression('t.ZSTARTDATE')} AS startAt,
			${localDateExpression('t.ZSTARTDATE')} AS startLocalDate,
			${dateExpression('t.ZENDDATE')} AS endAt,
			${localDateExpression('t.ZENDDATE')} AS endLocalDate,
			${dateExpression('t.ZCREATIONDATE')} AS createdAt,
			${dateExpression('t.ZLASTMODIFIEDDATE')} AS updatedAt,
			${dateExpression('t.ZCOMPLETIONDATE')} AS completedAt,
			COALESCE(t.ZREPEATRULE, '') AS repeatRule,
			COALESCE(t.ZREPEATFROM, '') AS repeatFrom,
			COALESCE(t.ZREPEATTASKID, '') AS repeatTaskId
		FROM ZTTTASK t
		LEFT JOIN ZTTPROJECT p ON t.ZPROJECT = p.Z_PK
		LEFT JOIN ZTTCOLUMN c ON t.ZCOLUMN = c.Z_PK
		WHERE t.ZPROJECT = ?
			AND COALESCE(t.ZSTATUS, 0) = 0
			AND COALESCE(t.ZDELETIONSTATUS, 0) = 0
		ORDER BY t.ZSORTORDER ASC, t.ZLASTMODIFIEDDATE DESC
	`);

	return taskRowSchema.array().parse(statement.all(projectPk));
}

function queryAttachments(database: Database, projectPk: number) {
	//
	const statement = database.query(`
		SELECT
			COALESCE(t.ZENTITYID, a.ZTASKID, '') AS taskId,
			COALESCE(a.ZENTITYID, '') AS entityId,
			COALESCE(a.ZFILENAME, '') AS filename,
			COALESCE(a.ZLOCALFILEPATH, '') AS localFilePath,
			COALESCE(a.ZREFERENCEDATTACHMENTID, '') AS referencedAttachmentId,
			a.ZFILESIZE AS fileSize,
			a.ZFILETYPE AS fileType,
			a.ZSTATUS AS status,
			${dateExpression('a.ZCREATIONDATE')} AS createdAt,
			${dateExpression('a.ZLASTMODIFIEDDATE')} AS updatedAt
		FROM ZTTATTACHMENT a
		LEFT JOIN ZTTTASK t ON a.ZTASK = t.Z_PK
		WHERE t.ZPROJECT = ?
			AND COALESCE(t.ZSTATUS, 0) = 0
			AND COALESCE(t.ZDELETIONSTATUS, 0) = 0
		ORDER BY a.ZCREATIONDATE ASC
	`);

	return attachmentRowSchema.array().parse(statement.all(projectPk));
}

function queryChecklistItems(database: Database, projectPk: number) {
	//
	const statement = database.query(`
		SELECT
			COALESCE(t.ZENTITYID, '') AS taskId,
			COALESCE(ci.ZENTITYID, '') AS entityId,
			COALESCE(ci.ZTITLE, '') AS title,
			ci.ZSTATUS AS status,
			ci.ZSORTORDER AS sortOrder,
			${dateExpression('ci.ZSTARTDATE')} AS startAt,
			${dateExpression('ci.ZCOMPLETIONDATE')} AS completedAt
		FROM ZTTCHECKLISTITEM ci
		LEFT JOIN ZTTTASK t ON ci.ZTASK = t.Z_PK
		WHERE t.ZPROJECT = ?
			AND COALESCE(t.ZSTATUS, 0) = 0
			AND COALESCE(t.ZDELETIONSTATUS, 0) = 0
		ORDER BY ci.ZSORTORDER ASC
	`);

	return checklistItemRowSchema.array().parse(statement.all(projectPk));
}

function queryReminders(database: Database, projectPk: number) {
	//
	const statement = database.query(`
		SELECT
			COALESCE(t.ZENTITYID, '') AS taskId,
			COALESCE(r.ZENTITYID, '') AS entityId
		FROM ZTTREMINDER r
		LEFT JOIN ZTTTASK t ON r.ZTASK = t.Z_PK
		WHERE t.ZPROJECT = ?
			AND COALESCE(t.ZSTATUS, 0) = 0
			AND COALESCE(t.ZDELETIONSTATUS, 0) = 0
		ORDER BY r.Z_PK ASC
	`);

	return reminderRowSchema.array().parse(statement.all(projectPk));
}

function collectTaskFiles(root: string) {
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
		if (!entry.name.endsWith('.md') && !entry.name.endsWith('.mdx')) continue;

		filePaths.push(entryPath);
	}

	return filePaths.sort();
}

function loadExistingTaskIds() {
	//
	const taskIds = new Map<string, string>();
	const taskIdPattern = /"taskId"\s*:\s*"([^"]+)"/g;

	for (const root of [resolve('files'), resolve('private/files')]) {
		for (const filePath of collectTaskFiles(root)) {
			const content = readFileSync(filePath, 'utf-8');

			for (const match of content.matchAll(taskIdPattern)) {
				const taskId = match[1];
				if (!taskId) continue;

				taskIds.set(taskId, filePath);
			}
		}
	}

	return taskIds;
}

function groupByTaskId<TItem extends { taskId: string }>(items: TItem[]) {
	//
	const grouped = new Map<string, TItem[]>();

	for (const item of items) {
		grouped.set(item.taskId, (grouped.get(item.taskId) ?? []).concat(item));
	}

	return grouped;
}

function slugify(value: string) {
	//
	return value
		.normalize('NFKD')
		.replace(/[^\x00-\x7F]/g, '')
		.toLowerCase()
		.replace(/https?:\/\//g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+/g, '')
		.replace(/-+$/g, '')
		.slice(0, 56)
		.replace(/-+$/g, '');
}

function firstMeaningfulLine(...values: string[]) {
	//
	for (const value of values) {
		for (const line of value.split(/\r?\n/)) {
			const trimmedLine = line.trim();
			if (trimmedLine.length > 0) return trimmedLine;
		}
	}

	return null;
}

function getTaskTitle(task: TaskRow) {
	//
	return (
		firstMeaningfulLine(task.title, task.content, task.description, task.notionBlockString) ??
		`TickTick task ${task.entityId.slice(-8)}`
	);
}

function buildFilePath(task: TaskRow, outputDir: string) {
	//
	const title = getTaskTitle(task);
	const slug = slugify(title) || 'ticktick-task';
	const taskSuffix = task.entityId.slice(-8);
	const fileSlug = `${slug}-${taskSuffix}`;

	return join(outputDir, fileSlug, '_index.md');
}

function buildChildFilePath(parentFilePath: string, task: TaskRow) {
	//
	const title = getTaskTitle(task);
	const slug = slugify(title) || 'ticktick-task';
	const taskSuffix = task.entityId.slice(-8);
	return join(dirname(parentFilePath), `${slug}-${taskSuffix}`, '_index.md');
}

function mapTickTickPriority(priority: number) {
	//
	if (priority >= 5) return 'high';
	if (priority >= 3) return 'medium';
	if (priority >= 1) return 'low';
	return null;
}

function renderPriorityFrontmatter(priority: number) {
	//
	const localPriority = mapTickTickPriority(priority);
	if (!localPriority) return '';

	return `priority: ${localPriority}\n`;
}

function yamlString(value: string) {
	//
	return JSON.stringify(value);
}

function uniqueValues(values: string[]) {
	//
	return values.filter((value, index) => value.length > 0 && values.indexOf(value) === index);
}

function buildTagValue(value: string) {
	//
	const slug = slugify(value);
	if (slug === 'use-cases') return 'use-case';
	return slug;
}

function buildTags(task: TaskRow, projectConfig: ProjectConfig) {
	//
	const tags = ['source:ticktick', `ticktick-list:${buildTagValue(projectConfig.label)}`];

	if (projectConfig.label === 'References') {
		tags.push('class:reference');
	}

	if (projectConfig.label === 'Meseeks' && task.columnName.trim().length > 0) {
		tags.push(`ticktick-status:${buildTagValue(task.columnName)}`);
	}

	return tags;
}

function safeExtension(fileName: string) {
	//
	const extension = extname(fileName).toLowerCase();
	if (extension === '.md' || extension === '.mdx' || extension === '.txt') return '.bin';
	if (!/^\.[a-z0-9]{1,10}$/.test(extension)) return '.bin';
	return extension;
}

function withoutExtension(fileName: string) {
	//
	const extension = extname(fileName);
	if (!extension) return fileName;
	return fileName.slice(0, fileName.length - extension.length);
}

function buildAttachmentFileName(attachment: AttachmentRow, usedFileNames: Set<string>) {
	//
	const sourceName = attachment.filename || basename(attachment.localFilePath) || attachment.entityId;
	const extension = safeExtension(sourceName);
	const slug = slugify(withoutExtension(sourceName)) || 'attachment';
	const baseName = `${attachment.entityId.slice(-8)}-${slug}`.slice(0, 88).replace(/-+$/g, '');
	let fileName = `${baseName}${extension}`;
	let attempt = 2;

	while (usedFileNames.has(fileName)) {
		fileName = `${baseName}-${attempt}${extension}`;
		attempt += 1;
	}

	usedFileNames.add(fileName);
	return fileName;
}

function collectAttachmentCacheFiles(root: string) {
	//
	if (!existsSync(root)) return [];

	const filePaths: string[] = [];
	const entries = readdirSync(root, { withFileTypes: true });

	for (const entry of entries) {
		const entryPath = join(root, entry.name);

		if (entry.isDirectory()) {
			filePaths.push(...collectAttachmentCacheFiles(entryPath));
			continue;
		}

		if (!entry.isFile()) continue;
		filePaths.push(entryPath);
	}

	return filePaths;
}

function findAttachmentInCache(attachment: AttachmentRow, attachmentsRoot: string) {
	//
	if (attachment.localFilePath && existsSync(attachment.localFilePath)) return attachment.localFilePath;
	if (!existsSync(attachmentsRoot)) return null;

	const filePaths = collectAttachmentCacheFiles(attachmentsRoot);
	const fileName = attachment.filename.trim();
	const idPrefixes = uniqueValues([attachment.entityId, attachment.referencedAttachmentId]);
	const taskPathSegment = `/${attachment.taskId}/`;
	const taskScopedPaths = filePaths.filter((filePath) => filePath.includes(taskPathSegment));

	for (const filePath of taskScopedPaths) {
		const candidateName = basename(filePath);

		if (fileName && candidateName === fileName) return filePath;
		if (fileName && idPrefixes.some((idPrefix) => candidateName === `${idPrefix}_${fileName}`)) return filePath;
		if (idPrefixes.some((idPrefix) => candidateName.startsWith(`${idPrefix}_`))) return filePath;
	}

	for (const filePath of filePaths) {
		const candidateName = basename(filePath);

		if (idPrefixes.some((idPrefix) => candidateName === idPrefix || candidateName.startsWith(`${idPrefix}_`)))
			return filePath;
	}

	if (!fileName) return null;

	return filePaths.find((filePath) => basename(filePath) === fileName) ?? null;
}

function bodyContent(content: string) {
	//
	const trimmedContent = content.trim();
	if (!trimmedContent) return '';

	return `${trimmedContent}\n\n`;
}

function titleHasOnlyLinkValue(title: string) {
	//
	const trimmedTitle = title.trim();
	if (!trimmedTitle) return false;
	if (/^https?:\/\/\S+$/u.test(trimmedTitle)) return true;
	if (/^\[[\s\S]+?\]\(https?:\/\/[^)]+\)$/u.test(trimmedTitle)) return true;
	if (/^watch\s+(\[[\s\S]+?\]\(https?:\/\/[^)]+\)|https?:\/\/\S+)$/iu.test(trimmedTitle)) return true;
	return false;
}

function bodyValuesForTask(task: TaskRow) {
	//
	const bodyValues = uniqueValues([task.content.trim(), task.description.trim(), task.notionBlockString.trim()]);
	if (bodyValues.length > 0) return bodyValues;
	if (titleHasOnlyLinkValue(task.title)) return [task.title.trim()];
	return [];
}

function listMetadata(label: string, value: string | number | null) {
	//
	if (value === null) return '';
	if (typeof value === 'string' && value.trim().length === 0) return '';

	return `- ${label}: \`${String(value)}\`\n`;
}

function renderSourceMetadata(task: TaskRow, projectConfig: ProjectConfig) {
	//
	return (
		'## TickTick source\n\n' +
		listMetadata('Project', `${task.projectName} (${task.projectId})`) +
		listMetadata('List tag', `ticktick-list:${buildTagValue(projectConfig.label)}`) +
		listMetadata('Task id', task.entityId) +
		listMetadata('Parent task id', task.parentId || null) +
		listMetadata('Column', task.columnName ? `${task.columnName} (${task.columnId})` : null) +
		listMetadata(
			'Status tag',
			projectConfig.label === 'Meseeks' && task.columnName
				? `ticktick-status:${buildTagValue(task.columnName)}`
				: null,
		) +
		listMetadata('Priority', task.priority) +
		listMetadata('Created', task.createdAt) +
		listMetadata('Updated', task.updatedAt) +
		listMetadata('Start', task.startAt) +
		listMetadata('Start local date', task.startLocalDate) +
		listMetadata('End', task.endAt) +
		listMetadata('End local date', task.endLocalDate) +
		listMetadata('Sort order', task.sortOrder) +
		'\n'
	);
}

function buildAttachmentImports(attachments: AttachmentRow[], filePath: string, args: Args, shouldCopy: boolean) {
	//
	if (attachments.length === 0) return [];

	const attachmentDirectory = join(dirname(filePath), 'attachments');
	const usedFileNames = new Set<string>();
	const imports: AttachmentImport[] = [];

	if (shouldCopy) mkdirSync(attachmentDirectory, { recursive: true });

	for (const attachment of attachments) {
		const fileName = buildAttachmentFileName(attachment, usedFileNames);
		const destinationPath = join(attachmentDirectory, fileName);
		const relativeLink = `attachments/${fileName}`;

		if (!shouldCopy) {
			imports.push({
				attachment,
				fileName,
				relativeLink,
				destinationPath,
				sourcePath: null,
				status: 'dry-run',
			});
			continue;
		}

		const sourcePath = findAttachmentInCache(attachment, args.attachmentsRoot);

		if (!sourcePath) {
			imports.push({
				attachment,
				fileName,
				relativeLink,
				destinationPath,
				sourcePath: null,
				status: 'missing',
			});
			continue;
		}

		copyFileSync(sourcePath, destinationPath);
		imports.push({
			attachment,
			fileName,
			relativeLink,
			destinationPath,
			sourcePath,
			status: 'copied',
		});
	}

	return imports;
}

function renderAttachments(attachmentImports: AttachmentImport[]) {
	//
	if (attachmentImports.length === 0) return '';

	const lines = attachmentImports.map((attachmentImport) => {
		const attachment = attachmentImport.attachment;
		const filename = attachment.filename || basename(attachment.localFilePath) || attachment.entityId;
		const details = [attachment.fileSize === null ? '' : `${attachment.fileSize} bytes`].filter(Boolean);

		if (attachmentImport.status === 'missing') {
			return `- ${filename} (${details.concat(`missing local source: ${attachment.localFilePath || 'empty path'}`).join(', ')})`;
		}

		return `- [${filename}](${attachmentImport.relativeLink})${details.length > 0 ? ` (${details.join(', ')})` : ''}`;
	});

	return `## Attachments\n\n${lines.join('\n')}\n\n`;
}

function renderChecklistItems(items: ChecklistItemRow[]) {
	//
	if (items.length === 0) return '';

	const lines = items.map((item) => {
		const marker = item.status === 2 ? 'x' : ' ';
		return `- [${marker}] ${item.title || item.entityId}`;
	});

	return `## TickTick checklist\n\n${lines.join('\n')}\n\n`;
}

function escapeRegExp(value: string) {
	//
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function rewriteAttachmentReferences(value: string, attachmentImports: AttachmentImport[]) {
	//
	let nextValue = value;

	for (const attachmentImport of attachmentImports) {
		const attachment = attachmentImport.attachment;
		const originalPaths = uniqueValues([
			attachment.filename ? `${attachment.referencedAttachmentId}/${attachment.filename}` : '',
			attachment.filename ? `${attachment.entityId}/${attachment.filename}` : '',
		]);

		for (const originalPath of originalPaths) {
			nextValue = nextValue.replace(new RegExp(escapeRegExp(originalPath), 'g'), attachmentImport.relativeLink);
		}
	}

	return nextValue;
}

function buildTaskPayload(
	task: TaskRow,
	children: TaskRow[],
	attachmentImports: AttachmentImport[],
	tags: string[],
	args: Args,
) {
	//
	return {
		importedAt: args.importDate,
		tags,
		tickTick: {
			taskId: task.entityId,
			parentTaskId: task.parentId || null,
			projectId: task.projectId,
			projectName: task.projectName,
			columnId: task.columnId || null,
			columnName: task.columnName || null,
			title: task.title,
			content: task.content,
			description: task.description,
			notionBlockString: task.notionBlockString,
			status: task.status,
			deletionStatus: task.deletionStatus,
			priority: task.priority,
			progress: task.progress,
			sortOrder: task.sortOrder,
			taskType: task.taskType,
			commentCount: task.commentCount,
			tagString: task.tagString,
			timeZone: task.timeZoneName,
			startAt: task.startAt,
			startLocalDate: task.startLocalDate,
			endAt: task.endAt,
			endLocalDate: task.endLocalDate,
			createdAt: task.createdAt,
			updatedAt: task.updatedAt,
			completedAt: task.completedAt,
			repeatRule: task.repeatRule || null,
			repeatFrom: task.repeatFrom || null,
			repeatTaskId: task.repeatTaskId || null,
			embeddedChildTaskIds: children.map((child) => child.entityId),
		},
		children: children.map((child) => ({
			taskId: child.entityId,
			parentTaskId: child.parentId,
			title: child.title,
			content: child.content,
			description: child.description,
			columnId: child.columnId || null,
			columnName: child.columnName || null,
			priority: child.priority,
			sortOrder: child.sortOrder,
			createdAt: child.createdAt,
			updatedAt: child.updatedAt,
			startLocalDate: child.startLocalDate,
			endLocalDate: child.endLocalDate,
		})),
		attachments: attachmentImports.map((attachmentImport) => ({
			...attachmentImport.attachment,
			importedFileName: attachmentImport.fileName,
			importedRelativePath: attachmentImport.relativeLink,
			importedSourcePath: attachmentImport.sourcePath,
			importStatus: attachmentImport.status,
		})),
		checklistItems: [],
		reminders: [],
	};
}

function buildPayload(importedTask: ImportedTask, attachmentImports: AttachmentImport[], tags: string[], args: Args) {
	//
	const payload = buildTaskPayload(importedTask.task, importedTask.children, attachmentImports, tags, args);
	return {
		...payload,
		checklistItems: importedTask.checklistItems,
		reminders: importedTask.reminders,
	};
}

function renderTaskFile(
	importedTask: ImportedTask,
	projectConfig: ProjectConfig,
	args: Args,
	attachmentImports: AttachmentImport[],
) {
	//
	const task = importedTask.task;
	const title = getTaskTitle(task);
	const tags = buildTags(task, projectConfig);
	const bodyValues = bodyValuesForTask(task);
	const parentAttachmentImports = attachmentImports.filter(
		(attachmentImport) => attachmentImport.attachment.taskId === task.entityId,
	);
	const payload = buildPayload(importedTask, attachmentImports, tags, args);

	return `---
title: ${yamlString(title)}
${renderPriorityFrontmatter(task.priority)}tags: [${tags.join(', ')}]
---

${bodyContent(bodyValues.join('\n\n'))}${renderChecklistItems(importedTask.checklistItems)}${renderAttachments(parentAttachmentImports)}${renderSourceMetadata(task, projectConfig)}\`\`\`json
${JSON.stringify(payload, null, 2)}
\`\`\`
`;
}

function renderChildTaskFile(
	parentTask: TaskRow,
	child: TaskRow,
	projectConfig: ProjectConfig,
	args: Args,
	attachmentImports: AttachmentImport[],
) {
	//
	const title = getTaskTitle(child);
	const tags = buildTags(child, projectConfig);
	const childAttachmentImports = attachmentImports.filter(
		(attachmentImport) => attachmentImport.attachment.taskId === child.entityId,
	);
	const bodyValues = uniqueValues([
		child.content.trim(),
		child.description.trim(),
		child.notionBlockString.trim(),
	]);
	const titleBodyValues = bodyValues.length > 0 ? bodyValues : bodyValuesForTask(child);
	const renderedBodyValues = titleBodyValues.map((bodyValue) =>
		rewriteAttachmentReferences(bodyValue, childAttachmentImports)
	);
	const payload = buildTaskPayload(child, [], childAttachmentImports, tags, args);

	return `---
title: ${yamlString(title)}
${renderPriorityFrontmatter(child.priority)}tags: [${tags.join(', ')}]
---

${bodyContent(renderedBodyValues.join('\n\n'))}${renderAttachments(childAttachmentImports)}${renderSourceMetadata(child, projectConfig)}- TickTick parent task id: \`${parentTask.entityId}\`

\`\`\`json
${JSON.stringify(payload, null, 2)}
\`\`\`
`;
}

function buildImportedTasks(
	tasks: TaskRow[],
	attachments: AttachmentRow[],
	checklistItems: ChecklistItemRow[],
	reminders: ReminderRow[],
) {
	//
	const tasksById = new Map(tasks.map((task) => [task.entityId, task]));
	const childrenByParentId = new Map<string, TaskRow[]>();
	const attachmentsByTaskId = groupByTaskId(attachments);
	const checklistItemsByTaskId = groupByTaskId(checklistItems);
	const remindersByTaskId = groupByTaskId(reminders);
	const importedTasks: ImportedTask[] = [];
	let embeddedChildRows = 0;
	let orphanChildRows = 0;

	for (const task of tasks) {
		if (task.parentId && tasksById.has(task.parentId)) {
			childrenByParentId.set(task.parentId, (childrenByParentId.get(task.parentId) ?? []).concat(task));
			embeddedChildRows += 1;
			continue;
		}

		if (task.parentId) orphanChildRows += 1;
	}

	for (const task of tasks) {
		if (task.parentId && tasksById.has(task.parentId)) continue;

		const children = childrenByParentId.get(task.entityId) ?? [];
		const childAttachments = children.flatMap((child) => attachmentsByTaskId.get(child.entityId) ?? []);
		const childChecklistItems = children.flatMap((child) => checklistItemsByTaskId.get(child.entityId) ?? []);
		const childReminders = children.flatMap((child) => remindersByTaskId.get(child.entityId) ?? []);

		importedTasks.push({
			task,
			children,
			attachments: (attachmentsByTaskId.get(task.entityId) ?? []).concat(childAttachments),
			checklistItems: (checklistItemsByTaskId.get(task.entityId) ?? []).concat(childChecklistItems),
			reminders: (remindersByTaskId.get(task.entityId) ?? []).concat(childReminders),
		});
	}

	return {
		importedTasks,
		attachmentsByTaskId,
		embeddedChildRows,
		orphanChildRows,
	};
}

function doesTaskMatchFilters(task: TaskRow, args: Args) {
	//
	if (args.priority !== null && task.priority !== args.priority) return false;

	if (args.dueDate !== null && task.startLocalDate !== args.dueDate && task.endLocalDate !== args.dueDate)
		return false;

	return true;
}

function selectFilteredTasks(tasks: TaskRow[], args: Args) {
	//
	if (args.priority === null && args.dueDate === null) return tasks;

	const selectedTaskIds = new Set(
		tasks.filter((task) => doesTaskMatchFilters(task, args)).map((task) => task.entityId),
	);
	let hasAddedTask = true;

	while (hasAddedTask) {
		hasAddedTask = false;

		for (const task of tasks) {
			if (!task.parentId) continue;
			if (!selectedTaskIds.has(task.parentId)) continue;
			if (selectedTaskIds.has(task.entityId)) continue;

			selectedTaskIds.add(task.entityId);
			hasAddedTask = true;
		}
	}

	return tasks.filter((task) => selectedTaskIds.has(task.entityId));
}

function filterRowsForTasks<TItem extends { taskId: string }>(items: TItem[], tasks: TaskRow[]) {
	//
	if (tasks.length === 0) return [];

	const taskIds = new Set(tasks.map((task) => task.entityId));
	return items.filter((item) => taskIds.has(item.taskId));
}

function countAttachmentImports(importedFiles: ImportedFile[], status: 'copiedAttachments' | 'missingAttachments') {
	//
	return importedFiles.reduce((total, file) => total + file[status], 0);
}

function findProjectConfig(project: ProjectRow, args: Args) {
	//
	const knownConfig = projectConfigs.find((config) => config.id === project.entityId);
	if (knownConfig) return knownConfig;
	if (!args.allProjects) return null;

	return {
		id: project.entityId,
		label: project.name || project.entityId,
		outputDir: defaultAllProjectsOutputDir,
	};
}

function importProject(database: Database, project: ProjectRow, existingTaskIds: Map<string, string>, args: Args) {
	//
	const config = findProjectConfig(project, args);
	if (!config) throw new Error(`No local import config for TickTick project ${project.name} (${project.entityId})`);

	const sourceCounts = querySourceCounts(database, project.pk);
	const openTasks = selectFilteredTasks(queryOpenTasks(database, project.pk), args);
	const attachments = filterRowsForTasks(queryAttachments(database, project.pk), openTasks);
	const checklistItems = filterRowsForTasks(queryChecklistItems(database, project.pk), openTasks);
	const reminders = filterRowsForTasks(queryReminders(database, project.pk), openTasks);
	const built = buildImportedTasks(openTasks, attachments, checklistItems, reminders);
	const importedFiles: ImportedFile[] = [];

	mkdirSync(config.outputDir, { recursive: true });

	for (const importedTask of built.importedTasks) {
		const existingPath = existingTaskIds.get(importedTask.task.entityId);
		const filePath = buildFilePath(importedTask.task, config.outputDir);
		const shouldRewrite = args.overwrite || !existingPath;

		if (existingPath && !args.overwrite) {
			importedFiles.push({
				action: 'kept',
				taskId: importedTask.task.entityId,
				filePath: relative(process.cwd(), existingPath),
				project: config.label,
				embeddedChildren: importedTask.children.length,
				attachments: importedTask.attachments.length,
				copiedAttachments: 0,
				missingAttachments: 0,
			});
			continue;
		}

		const attachmentImports = buildAttachmentImports(
			importedTask.attachments,
			filePath,
			args,
			shouldRewrite && !args.dryRun,
		);
		const fileContent = renderTaskFile(importedTask, config, args, attachmentImports);

		if (!args.dryRun) {
			if (existingPath && existingPath !== filePath && existsSync(existingPath)) {
				unlinkSync(existingPath);
			}

			mkdirSync(dirname(filePath), { recursive: true });
			writeFileSync(filePath, fileContent);
			existingTaskIds.set(importedTask.task.entityId, filePath);

			for (const child of importedTask.children) {
				const childFilePath = buildChildFilePath(filePath, child);
				const childFileContent = renderChildTaskFile(importedTask.task, child, config, args, attachmentImports);
				mkdirSync(dirname(childFilePath), { recursive: true });
				writeFileSync(childFilePath, childFileContent);
				existingTaskIds.set(child.entityId, childFilePath);
			}
		}

		importedFiles.push({
			action: 'created',
			taskId: importedTask.task.entityId,
			filePath: relative(process.cwd(), filePath),
			project: config.label,
			embeddedChildren: importedTask.children.length,
			attachments: importedTask.attachments.length,
			copiedAttachments: attachmentImports.filter((attachmentImport) => attachmentImport.status === 'copied')
				.length,
			missingAttachments: attachmentImports.filter((attachmentImport) => attachmentImport.status === 'missing')
				.length,
		});
	}

	const summary: ProjectSummary = {
		project: project.name,
		projectId: project.entityId,
		outputDir: relative(process.cwd(), config.outputDir),
		sourceCounts,
		openRows: openTasks.length,
		rootRows: built.importedTasks.length,
		embeddedChildRows: built.embeddedChildRows,
		orphanChildRows: built.orphanChildRows,
		createdFiles: importedFiles.filter((file) => file.action === 'created').length,
		keptFiles: importedFiles.filter((file) => file.action === 'kept').length,
		attachments: attachments.length,
		copiedAttachments: countAttachmentImports(importedFiles, 'copiedAttachments'),
		missingAttachments: countAttachmentImports(importedFiles, 'missingAttachments'),
		checklistItems: checklistItems.length,
		reminders: reminders.length,
	};

	return {
		summary,
		importedFiles,
	};
}

function writeSummary(args: Args, projectSummaries: ProjectSummary[], importedFiles: ImportedFile[]) {
	//
	const summary = {
		importedAt: args.importDate,
		dryRun: args.dryRun,
		filters: {
			allProjects: args.allProjects,
			priority: args.priority,
			dueDate: args.dueDate,
		},
		source: {
			dbPath: args.dbPath,
			attachmentsRoot: args.attachmentsRoot,
			mode: 'readonly',
		},
		projects: projectSummaries,
		files: importedFiles,
		notes: [
			'TickTick was read from the local macOS SQLite store in readonly mode.',
			'Open, non-deletion-flagged rows were imported.',
			'When CLI filters are provided, they are applied before local task files are written.',
			'Every imported task gets source:ticktick plus ticktick-list:<list>.',
			'Meseeks board columns are preserved as ticktick-status:<status> tags.',
			'TickTick priority 0 is treated as no local priority; priority 1 maps to low.',
			'Child rows with an open parent are imported as local subtasks under the parent task folder.',
			'Imported tasks are written as task folders with _index.md; attachments live beside the owning task.',
			'Attachment files are copied from the local TickTick attachment cache when present; missing local files are recorded in the task payload.',
		],
	};

	if (!args.dryRun) {
		mkdirSync(dirname(args.summaryFile), { recursive: true });
		writeFileSync(args.summaryFile, `${JSON.stringify(summary, null, 2)}\n`);
	}

	const consoleSummary = {
		importedAt: summary.importedAt,
		dryRun: summary.dryRun,
		filters: summary.filters,
		source: summary.source,
		projects: summary.projects,
		fileCount: summary.files.length,
		summaryFile: args.dryRun ? null : relative(process.cwd(), args.summaryFile),
		notes: summary.notes,
	};

	console.info(JSON.stringify(args.verbose ? summary : consoleSummary, null, 2));
}

function main() {
	//
	const args = parseArgs(process.argv.slice(2));
	const database = new Database(args.dbPath, { readonly: true });
	const projects = queryProjects(database, args);
	const foundProjectIds = new Set(projects.map((project) => project.entityId));
	const missingProjects = args.allProjects
		? []
		: projectConfigs.filter((project) => !foundProjectIds.has(project.id));

	if (missingProjects.length > 0) {
		throw new Error(
			`Missing TickTick projects: ${missingProjects.map((project) => `${project.label} (${project.id})`).join(', ')}`,
		);
	}

	const existingTaskIds = loadExistingTaskIds();
	const projectSummaries: ProjectSummary[] = [];
	const importedFiles: ImportedFile[] = [];

	for (const project of projects) {
		const result = importProject(database, project, existingTaskIds, args);
		projectSummaries.push(result.summary);
		importedFiles.push(...result.importedFiles);
	}

	writeSummary(args, projectSummaries, importedFiles);
}

main();
