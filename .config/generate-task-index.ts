#!/usr/bin/env bun
/**
 * task index generator
 *
 * every task is a directory containing one _index.* body file.
 * task roots:
 * - tasks/
 * - private/tasks/
 *
 * generated indexes are consumed by apps/organizer.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, posix, relative, resolve } from 'node:path';
import { z } from 'zod/v3';

const PROJECT_ROOT = resolve(__dirname, '..');
const OUTPUT_DIR = join(PROJECT_ROOT, 'private', 'tasks', '.generated');
const OUTPUT_VERSION = 4;
const VERBOSE = process.argv.includes('--verbose');

type TaskSourceLabel = 'public' | 'private';
type BodyFormat = 'md' | 'mdx' | 'text' | 'empty';
type TaskSection = 'root' | 'inbox' | 'tasks' | 'references' | 'ideas' | 'other';
type TaskView = 'list' | 'board';

interface TaskSource {
	label: TaskSourceLabel;
	root: string;
}

interface TaskTag {
	tag: string;
	key: string | null;
	value: string;
}

interface TaskConfigColumn {
	id: string;
	label: string;
	tag: string | null;
}

interface TaskConfig {
	view: TaskView;
	scope: 'direct';
	columns: TaskConfigColumn[];
	hiddenTags: string[];
}

interface ParsedTaskFile {
	key: string;
	taskSource: TaskSourceLabel;
	id: string;
	taskPath: string;
	pathSegments: string[];
	section: TaskSection;
	relativePath: string;
	absolutePath: string;
	directoryPath: string;
	extension: string;
	frontmatter: Record<string, FrontmatterValue>;
	body: string;
	rawFrontmatter: string | null;
	hasFrontmatter: boolean;
	fileBytes: number;
	fileMtimeMs: number;
	fileCtimeMs: number;
	fileBirthtimeMs: number;
	isEmptyFile: boolean;
	config: TaskConfig;
	warnings: string[];
}

type FrontmatterScalar = string | number | boolean | null;
type FrontmatterValue = FrontmatterScalar | FrontmatterScalar[];

interface FrontmatterExtractionResult {
	frontmatter: Record<string, FrontmatterValue>;
	body: string;
	rawFrontmatter: string | null;
	hasFrontmatter: boolean;
	warnings: string[];
}

interface TaskRecord {
	key: string;
	taskSource: TaskSourceLabel;
	id: string;
	title: string;
	declaredTitle: string | null;
	titleSource: 'frontmatter' | 'heading' | 'filename';
	status: string;
	priority: string | null;
	tags: string[];
	tagDetails: TaskTag[];
	parentId: string | null;
	parentKey: string | null;
	parentSource: 'filesystem' | 'none';
	created: string;
	updated: string;
	source: TaskSourceLabel;
	hasFrontmatter: boolean;
	rawFrontmatter: string | null;
	bodyFormat: BodyFormat;
	body: string;
	bodyExcerpt: string;
	bodyWordCount: number;
	bodySearch: string;
	headingTitle: string | null;
	extension: string;
	relativePath: string;
	absolutePath: string;
	directoryPath: string;
	taskPath: string;
	pathSegments: string[];
	section: TaskSection;
	config: TaskConfig;
	fileBytes: number;
	fileMtimeMs: number;
	fileCtimeMs: number;
	isEmptyFile: boolean;
	warnings: string[];
}

interface TaskSummary {
	key: string;
	taskSource: TaskSourceLabel;
	id: string;
	title: string;
	declaredTitle: string | null;
	titleSource: 'frontmatter' | 'heading' | 'filename';
	status: string;
	priority: string | null;
	tags: string[];
	tagDetails: TaskTag[];
	parentId: string | null;
	parentKey: string | null;
	parentSource: 'filesystem' | 'none';
	created: string;
	updated: string;
	source: TaskSourceLabel;
	hasFrontmatter: boolean;
	bodyFormat: BodyFormat;
	bodyExcerpt: string;
	bodyWordCount: number;
	bodySearch: string;
	headingTitle: string | null;
	extension: string;
	relativePath: string;
	absolutePath: string;
	directoryPath: string;
	taskPath: string;
	pathSegments: string[];
	section: TaskSection;
	config: TaskConfig;
	fileBytes: number;
	fileMtimeMs: number;
	fileCtimeMs: number;
	isEmptyFile: boolean;
	warnings: string[];
}

interface TaskGraphNode {
	key: string;
	taskSource: TaskSourceLabel;
	id: string;
	title: string;
	status: string;
	parentId: string | null;
	parentKey: string | null;
	taskPath: string;
	relativePath: string;
	section: TaskSection;
}

interface TaskGraphEdge {
	type: 'parent';
	from: string;
	to: string | null;
	targetId: string;
	resolved: boolean;
}

interface TaskWarningEntry {
	taskKey: string;
	relativePath: string;
	message: string;
}

interface TaskTagGroupValue {
	tag: string;
	value: string;
	count: number;
}

interface TaskTagGroup {
	key: string | null;
	values: TaskTagGroupValue[];
}

interface BuildSummary {
	totalTasks: number;
	withFrontmatter: number;
	withoutFrontmatter: number;
	emptyFiles: number;
	bySource: Record<string, number>;
	bySection: Record<string, number>;
	byStatus: Record<string, number>;
	byBodyFormat: Record<string, number>;
	totalWarnings: number;
}

interface TaskLookupPayload {
	keyToPath: Record<string, string>;
	taskPathToKey: Record<string, string>;
	idToKeys: Record<string, string[]>;
	statusToKeys: Record<string, string[]>;
	tagToKeys: Record<string, string[]>;
	tagGroups: TaskTagGroup[];
}

const TASK_SOURCES: TaskSource[] = [
	{ label: 'public', root: join(PROJECT_ROOT, 'tasks') },
	{ label: 'private', root: join(PROJECT_ROOT, 'private', 'tasks') },
];

const INDEX_EXTENSIONS = ['.md', '.mdx', '.txt'];
const CONFIG_FILENAME = '_config.json';

const optionalStringSchema = z.preprocess((value) => normalizeOptionalString(value), z.string().min(1)).optional();
const optionalLowerStringSchema = z
	.preprocess((value) => normalizeOptionalLowerString(value), z.string().min(1))
	.optional();
const optionalStringArraySchema = z.preprocess((value) => normalizeStringArray(value), z.array(z.string())).optional();

const frontmatterSchema = z
	.object({
		title: optionalStringSchema,
		priority: optionalLowerStringSchema,
		tags: optionalStringArraySchema,
	})
	.passthrough();

const taskConfigColumnSchema = z.object({
	id: z.string().min(1),
	label: z.string().min(1),
	tag: z.string().min(1).nullable().optional(),
});

const taskConfigSchema = z
	.object({
		view: z.enum(['list', 'board']).optional(),
		scope: z.literal('direct').optional(),
		columns: z.array(taskConfigColumnSchema).optional(),
		hiddenTags: z.array(z.string().min(1)).optional(),
	})
	.passthrough();

type NormalizedFrontmatter = z.infer<typeof frontmatterSchema>;

function main(): void {
	//
	log(`building task indexes... target: ${OUTPUT_DIR}`);

	const parsedFiles: ParsedTaskFile[] = [];

	for (const taskSource of TASK_SOURCES) {
		if (!existsSync(taskSource.root)) {
			log(`skipping ${taskSource.label} source (not found): ${taskSource.root}`);
			continue;
		}

		const sourceFiles = findTaskIndexFiles(taskSource.root);
		const sourceParsed = sourceFiles.map((absolutePath) => parseTaskFile(absolutePath, taskSource));
		parsedFiles.push(...sourceParsed);
		log(`${taskSource.label}: ${sourceParsed.length} task files`);
	}

	const taskRecords = parsedFiles.map((parsedFile) => buildTaskRecord(parsedFile));
	taskRecords.sort((left, right) => left.key.localeCompare(right.key));

	const keyToTask = new Map<string, TaskRecord>();

	for (const task of taskRecords) {
		const existing = keyToTask.get(task.key);

		if (existing) {
			task.warnings.push(`duplicate task key detected with ${existing.relativePath}`);
			existing.warnings.push(`duplicate task key detected with ${task.relativePath}`);
			continue;
		}

		keyToTask.set(task.key, task);
	}

	const idToKeys = buildIdToKeysMap(taskRecords);
	const graphEdges: TaskGraphEdge[] = [];

	resolveParentLinks(taskRecords, keyToTask, graphEdges);

	const warnings = buildWarningEntries(taskRecords);
	const summary = buildSummary(taskRecords, warnings);

	writeOutputs(taskRecords, graphEdges, idToKeys, summary, warnings);

	console.info(`✓ task indexes: ${taskRecords.length} tasks, ${warnings.length} warnings`);
}

function log(message: string): void {
	//
	if (VERBOSE) console.info(message);
}

function findTaskIndexFiles(root: string): string[] {
	//
	const files: string[] = [];
	collectTaskIndexFiles(root, root, files);
	files.sort((left, right) => left.localeCompare(right));
	return files;
}

function collectTaskIndexFiles(root: string, directoryPath: string, files: string[]): void {
	//
	const indexFiles = findIndexFiles(directoryPath);

	if (indexFiles.length > 0) {
		files.push(indexFiles[0]);
	}

	const entries = readdirSync(directoryPath, { withFileTypes: true });

	for (const entry of entries) {
		if (!entry.isDirectory()) continue;
		if (shouldSkipDirectory(entry.name)) continue;

		collectTaskIndexFiles(root, join(directoryPath, entry.name), files);
	}
}

function shouldSkipDirectory(name: string): boolean {
	//
	if (name.startsWith('.')) return true;
	if (name === 'attachments') return true;
	if (name === 'node_modules') return true;
	return false;
}

function findIndexFiles(directoryPath: string): string[] {
	//
	const files: string[] = [];

	for (const extension of INDEX_EXTENSIONS) {
		const candidatePath = join(directoryPath, `_index${extension}`);
		if (!existsSync(candidatePath)) continue;
		files.push(candidatePath);
	}

	return files;
}

function parseTaskFile(absolutePath: string, taskSource: TaskSource): ParsedTaskFile {
	//
	const fileStats = statSync(absolutePath);
	const fileContent = readFileSync(absolutePath, 'utf-8');
	const normalizedContent = normalizeLineEndings(fileContent);
	const extraction = extractFrontmatter(normalizedContent);
	const relativePath = toPosixPath(relative(taskSource.root, absolutePath));
	const extension = extname(relativePath).toLowerCase();
	const directoryPath = toPosixPath(dirname(relativePath));
	const taskPath = directoryPath === '.' ? '' : directoryPath;
	const pathSegments = taskPath.length === 0 ? [] : taskPath.split('/');
	const section = inferTaskSection(pathSegments);
	const key = createTaskKey(taskPath, taskSource.label);
	const id = taskPath.length === 0 ? 'root' : taskPath;
	const configResult = readTaskConfig(taskSource.root, taskPath, section);
	const warnings = extraction.warnings.concat(configResult.warnings);
	const duplicateIndexFiles = findIndexFiles(dirname(absolutePath));

	if (duplicateIndexFiles.length > 1) {
		warnings.push(`multiple _index files found; using ${basename(absolutePath)}`);
	}

	return {
		key,
		taskSource: taskSource.label,
		id,
		taskPath,
		pathSegments,
		section,
		relativePath,
		absolutePath,
		directoryPath,
		extension,
		frontmatter: extraction.frontmatter,
		body: extraction.body,
		rawFrontmatter: extraction.rawFrontmatter,
		hasFrontmatter: extraction.hasFrontmatter,
		fileBytes: fileStats.size,
		fileMtimeMs: fileStats.mtimeMs,
		fileCtimeMs: fileStats.ctimeMs,
		fileBirthtimeMs: fileStats.birthtimeMs,
		isEmptyFile: normalizedContent.trim().length === 0,
		config: configResult.config,
		warnings,
	};
}

function readTaskConfig(root: string, taskPath: string, section: TaskSection): { config: TaskConfig; warnings: string[] } {
	//
	const defaultConfig = createDefaultTaskConfig(taskPath, section);
	const configPath = join(root, ...taskPathSegments(taskPath), CONFIG_FILENAME);

	if (!existsSync(configPath)) return { config: defaultConfig, warnings: [] };

	try {
		const parsedJson: unknown = JSON.parse(readFileSync(configPath, 'utf-8'));
		const parsedConfig = taskConfigSchema.safeParse(parsedJson);

		if (!parsedConfig.success) {
			return {
				config: defaultConfig,
				warnings: [`${CONFIG_FILENAME} schema parse failed, using defaults`],
			};
		}

		return {
			config: {
				view: parsedConfig.data.view ?? defaultConfig.view,
				scope: parsedConfig.data.scope ?? defaultConfig.scope,
				columns: normalizeConfigColumns(parsedConfig.data.columns, defaultConfig.columns),
				hiddenTags: dedupeStrings(parsedConfig.data.hiddenTags ?? defaultConfig.hiddenTags),
			},
			warnings: [],
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : 'unknown parse failure';
		return {
			config: defaultConfig,
			warnings: [`${CONFIG_FILENAME} parse failed: ${message}`],
		};
	}
}

function normalizeConfigColumns(
	columns: Array<z.infer<typeof taskConfigColumnSchema>> | undefined,
	defaultColumns: TaskConfigColumn[],
): TaskConfigColumn[] {
	//
	if (columns === undefined) return defaultColumns;

	return columns.map((column) => ({
		id: column.id,
		label: column.label,
		tag: column.tag ?? null,
	}));
}

function createDefaultTaskConfig(taskPath: string, section: TaskSection): TaskConfig {
	//
	if (taskPath === 'tasks') {
		return {
			view: 'board',
			scope: 'direct',
			columns: [
				{ id: 'backlog', label: 'Backlog', tag: 'status:backlog' },
				{ id: 'active', label: 'Active', tag: 'status:active' },
			],
			hiddenTags: ['status:completed'],
		};
	}

	if (section === 'tasks' && taskPath.length > 'tasks'.length) {
		return {
			view: 'board',
			scope: 'direct',
			columns: [
				{ id: 'backlog', label: 'Backlog', tag: 'status:backlog' },
				{ id: 'active', label: 'Active', tag: 'status:active' },
			],
			hiddenTags: ['status:completed'],
		};
	}

	return {
		view: 'list',
		scope: 'direct',
		columns: [],
		hiddenTags: [],
	};
}

function taskPathSegments(taskPath: string): string[] {
	//
	if (taskPath.length === 0) return [];
	return taskPath.split('/');
}

function inferTaskSection(pathSegments: string[]): TaskSection {
	//
	if (pathSegments.length === 0) return 'root';

	const firstSegment = pathSegments[0];
	if (firstSegment === 'inbox') return 'inbox';
	if (firstSegment === 'tasks') return 'tasks';
	if (firstSegment === 'references') return 'references';
	if (firstSegment === 'ideas') return 'ideas';

	return 'other';
}

function createTaskKey(taskPath: string, sourceLabel: TaskSourceLabel): string {
	//
	return `${sourceLabel}:${taskPath}`;
}

function normalizeLineEndings(value: string): string {
	//
	return value.replace(/\r\n/g, '\n');
}

function toPosixPath(filePath: string): string {
	//
	return filePath.split('\\').join('/');
}

function extractFrontmatter(content: string): FrontmatterExtractionResult {
	//
	const warnings: string[] = [];
	const withoutBom = content.replace(/^\uFEFF/, '');

	if (!withoutBom.startsWith('---\n') && withoutBom !== '---') {
		return {
			frontmatter: {},
			body: withoutBom,
			rawFrontmatter: null,
			hasFrontmatter: false,
			warnings,
		};
	}

	const lines = withoutBom.split('\n');

	if (lines.length === 0 || lines[0].trim() !== '---') {
		return {
			frontmatter: {},
			body: withoutBom,
			rawFrontmatter: null,
			hasFrontmatter: false,
			warnings,
		};
	}

	let closingIndex = -1;

	for (let index = 1; index < lines.length; index += 1) {
		if (lines[index].trim() !== '---') continue;
		closingIndex = index;
		break;
	}

	if (closingIndex < 0) {
		warnings.push('frontmatter opens with --- but never closes');
		return {
			frontmatter: {},
			body: withoutBom,
			rawFrontmatter: null,
			hasFrontmatter: false,
			warnings,
		};
	}

	const frontmatterLines = lines.slice(1, closingIndex);
	const bodyLines = lines.slice(closingIndex + 1);
	const rawFrontmatter = frontmatterLines.join('\n');
	const parsedFrontmatter = parseFrontmatterBlock(rawFrontmatter);

	return {
		frontmatter: parsedFrontmatter.frontmatter,
		body: bodyLines.join('\n'),
		rawFrontmatter,
		hasFrontmatter: true,
		warnings: warnings.concat(parsedFrontmatter.warnings),
	};
}

function parseFrontmatterBlock(rawFrontmatter: string): {
	frontmatter: Record<string, FrontmatterValue>;
	warnings: string[];
} {
	//
	const frontmatter: Record<string, FrontmatterValue> = {};
	const warnings: string[] = [];
	const lines = rawFrontmatter.split('\n');

	let index = 0;

	while (index < lines.length) {
		const originalLine = lines[index];
		const trimmedLine = originalLine.trim();

		if (trimmedLine.length === 0 || trimmedLine.startsWith('#')) {
			index += 1;
			continue;
		}

		const pairMatch = originalLine.match(/^([A-Za-z0-9_.-]+)\s*:\s*(.*)$/);

		if (!pairMatch) {
			warnings.push(`unparsed frontmatter line ${index + 1}: ${trimmedLine}`);
			index += 1;
			continue;
		}

		const key = pairMatch[1].trim();
		const rawValue = stripInlineComment(pairMatch[2].trim());

		if (rawValue.length === 0) {
			const listValues: FrontmatterScalar[] = [];
			let cursor = index + 1;

			while (cursor < lines.length) {
				const listLine = lines[cursor];
				const listItemMatch = listLine.match(/^\s*-\s+(.*)$/);

				if (!listItemMatch) break;

				const rawItemValue = stripInlineComment(listItemMatch[1].trim());
				listValues.push(parseScalarFrontmatterValue(rawItemValue));
				cursor += 1;
			}

			if (listValues.length > 0) {
				frontmatter[key] = listValues;
				index = cursor;
				continue;
			}

			frontmatter[key] = null;
			index += 1;
			continue;
		}

		frontmatter[key] = parseFrontmatterValue(rawValue);
		index += 1;
	}

	return { frontmatter, warnings };
}

function stripInlineComment(rawValue: string): string {
	//
	let quote: '"' | "'" | null = null;

	for (let index = 0; index < rawValue.length; index += 1) {
		const char = rawValue[index];

		if (quote !== null) {
			if (char === quote && rawValue[index - 1] !== '\\') {
				quote = null;
			}
			continue;
		}

		if (char === '"' || char === "'") {
			quote = char;
			continue;
		}

		if (char !== '#') continue;

		const previousChar = index > 0 ? rawValue[index - 1] : ' ';
		if (!/\s/.test(previousChar)) continue;

		return rawValue.slice(0, index).trimEnd();
	}

	return rawValue;
}

function parseFrontmatterValue(rawValue: string): FrontmatterValue {
	//
	const trimmedValue = rawValue.trim();

	if (trimmedValue.startsWith('[') && trimmedValue.endsWith(']')) {
		const list = parseBracketList(trimmedValue);
		if (list !== null) return list;
	}

	return parseScalarFrontmatterValue(trimmedValue);
}

function parseBracketList(rawValue: string): FrontmatterScalar[] | null {
	//
	const innerValue = rawValue.slice(1, -1).trim();

	if (innerValue.length === 0) return [];

	const values: FrontmatterScalar[] = [];
	let currentToken = '';
	let quote: '"' | "'" | null = null;
	let isEscaped = false;

	for (let index = 0; index < innerValue.length; index += 1) {
		const char = innerValue[index];

		if (isEscaped) {
			currentToken += char;
			isEscaped = false;
			continue;
		}

		if (char === '\\') {
			currentToken += char;
			isEscaped = true;
			continue;
		}

		if (quote !== null) {
			currentToken += char;

			if (char === quote) {
				quote = null;
			}

			continue;
		}

		if (char === '"' || char === "'") {
			currentToken += char;
			quote = char;
			continue;
		}

		if (char === ',') {
			const trimmedToken = currentToken.trim();
			if (trimmedToken.length > 0) values.push(parseScalarFrontmatterValue(trimmedToken));
			currentToken = '';
			continue;
		}

		currentToken += char;
	}

	if (quote !== null) return null;

	const finalToken = currentToken.trim();
	if (finalToken.length > 0) values.push(parseScalarFrontmatterValue(finalToken));

	return values;
}

function parseScalarFrontmatterValue(rawValue: string): FrontmatterScalar {
	//
	const trimmedValue = rawValue.trim();

	if (trimmedValue.length === 0) return '';
	if (trimmedValue === 'null') return null;
	if (trimmedValue === 'true') return true;
	if (trimmedValue === 'false') return false;

	const quotedValue = parseQuotedScalar(trimmedValue);
	if (quotedValue !== null) return quotedValue;

	const numericValue = Number(trimmedValue);
	if (Number.isFinite(numericValue) && /^-?\d+(?:\.\d+)?$/.test(trimmedValue)) return numericValue;

	return trimmedValue;
}

function parseQuotedScalar(value: string): string | null {
	//
	if (value.length < 2) return null;

	const quote = value[0];
	const lastQuote = value[value.length - 1];

	if ((quote !== '"' && quote !== "'") || lastQuote !== quote) return null;

	const innerValue = value.slice(1, -1);

	if (quote === "'") return innerValue.replace(/\\'/g, "'");

	return innerValue.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

function normalizeOptionalString(value: unknown): string | undefined {
	//
	const scalar = normalizeScalarString(value);
	return scalar ?? undefined;
}

function normalizeOptionalLowerString(value: unknown): string | undefined {
	//
	const scalar = normalizeScalarString(value);
	return scalar === null ? undefined : scalar.toLowerCase();
}

function normalizeStringArray(value: unknown): string[] | undefined {
	//
	if (value === undefined || value === null) return undefined;

	if (Array.isArray(value)) {
		const strings = value.map((item) => normalizeScalarString(item)).filter((item): item is string => item !== null);
		return dedupeStrings(strings);
	}

	const scalar = normalizeScalarString(value);
	if (scalar === null) return undefined;

	if (scalar.includes(',')) {
		const values = scalar
			.split(',')
			.map((item) => item.trim())
			.filter((item) => item.length > 0);

		return dedupeStrings(values);
	}

	return dedupeStrings([scalar]);
}

function normalizeScalarString(value: unknown): string | null {
	//
	if (typeof value === 'string') {
		const trimmedValue = value.trim();
		if (trimmedValue.length === 0) return null;
		return trimmedValue;
	}

	if (typeof value === 'number' || typeof value === 'boolean') {
		return String(value);
	}

	return null;
}

function buildTaskRecord(parsedTask: ParsedTaskFile): TaskRecord {
	//
	const warnings = parsedTask.warnings.slice();
	const frontmatterResult = frontmatterSchema.safeParse(parsedTask.frontmatter);
	const frontmatter: NormalizedFrontmatter = frontmatterResult.success ? frontmatterResult.data : {};

	if (!frontmatterResult.success) {
		warnings.push('frontmatter schema parse failed, using fallback defaults');
	}

	const headingTitle = extractHeadingTitle(parsedTask.body);
	const declaredTitle = frontmatter.title ?? null;
	const fallbackTitle = buildTitleFromPath(parsedTask.taskPath);
	const title = declaredTitle ?? headingTitle ?? fallbackTitle;
	const titleSource = declaredTitle ? 'frontmatter' : headingTitle ? 'heading' : 'filename';

	const priority = frontmatter.priority ?? null;
	const tags = dedupeStrings(frontmatter.tags ?? []);
	const tagDetails = tags.map((tag) => parseTaskTag(tag));
	const status = resolveStatus(tags, parsedTask.section, parsedTask.taskPath, warnings);

	const bodyFormat = inferBodyFormat(parsedTask.extension, parsedTask.body);
	const bodyExcerpt = buildBodyExcerpt(parsedTask.body, 280);
	const bodyWordCount = countWords(parsedTask.body);
	const bodySearch = normalizeSearchText(parsedTask.body);

	if (parsedTask.section === 'other') warnings.push('task path is outside inbox/tasks/references/ideas');
	if (!parsedTask.hasFrontmatter) warnings.push('missing frontmatter');
	if (declaredTitle === null) warnings.push('missing title in frontmatter, using heading or filename');
	if (bodyFormat === 'empty') warnings.push('empty body');

	return {
		key: parsedTask.key,
		taskSource: parsedTask.taskSource,
		id: parsedTask.id,
		title,
		declaredTitle,
		titleSource,
		status,
		priority,
		tags,
		tagDetails,
		parentId: null,
		parentKey: null,
		parentSource: 'none',
		created: toIsoTimestamp(resolveCreatedTimestampMs(parsedTask)),
		updated: toIsoTimestamp(parsedTask.fileMtimeMs),
		source: parsedTask.taskSource,
		hasFrontmatter: parsedTask.hasFrontmatter,
		rawFrontmatter: parsedTask.rawFrontmatter,
		bodyFormat,
		body: parsedTask.body,
		bodyExcerpt,
		bodyWordCount,
		bodySearch,
		headingTitle,
		extension: parsedTask.extension,
		relativePath: parsedTask.relativePath,
		absolutePath: parsedTask.absolutePath,
		directoryPath: parsedTask.directoryPath,
		taskPath: parsedTask.taskPath,
		pathSegments: parsedTask.pathSegments,
		section: parsedTask.section,
		config: parsedTask.config,
		fileBytes: parsedTask.fileBytes,
		fileMtimeMs: parsedTask.fileMtimeMs,
		fileCtimeMs: parsedTask.fileCtimeMs,
		isEmptyFile: parsedTask.isEmptyFile,
		warnings,
	};
}

function resolveStatus(tags: string[], section: TaskSection, taskPath: string, warnings: string[]): string {
	//
	const statusTags = tags.filter((tag) => tag.startsWith('status:'));

	if (statusTags.length > 1) {
		warnings.push(`multiple status tags found: ${statusTags.join(', ')}`);
	}

	if (section !== 'tasks' || taskPath === 'tasks') {
		if (statusTags.length > 0) warnings.push('status tag found outside actionable tasks hierarchy');
		return 'none';
	}

	if (statusTags.length === 0) {
		warnings.push('actionable task is missing status tag');
		return 'none';
	}

	const firstStatus = parseTaskTag(statusTags[0]).value;
	if (firstStatus.length === 0) return 'none';
	return firstStatus;
}

function extractHeadingTitle(body: string): string | null {
	//
	const lines = normalizeLineEndings(body).split('\n');

	for (const line of lines) {
		const trimmedLine = line.trim();
		const headingMatch = trimmedLine.match(/^#\s+(.+)$/);

		if (!headingMatch) continue;

		const headingText = headingMatch[1].trim();
		if (headingText.length === 0) continue;

		return headingText;
	}

	return null;
}

function buildTitleFromPath(taskPath: string): string {
	//
	if (taskPath.length === 0) return 'root';

	const normalizedName = posix.basename(taskPath);
	const title = normalizedName.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();

	if (title.length > 0) return title;

	return 'untitled';
}

function toIsoTimestamp(epochMs: number): string {
	//
	return new Date(epochMs).toISOString();
}

function resolveCreatedTimestampMs(parsedTask: ParsedTaskFile): number {
	//
	if (Number.isFinite(parsedTask.fileBirthtimeMs) && parsedTask.fileBirthtimeMs > 0) {
		return parsedTask.fileBirthtimeMs;
	}

	return parsedTask.fileCtimeMs;
}

function inferBodyFormat(extension: string, body: string): BodyFormat {
	//
	if (body.trim().length === 0) return 'empty';
	if (extension === '.mdx') return 'mdx';
	if (extension === '.md') return 'md';

	return 'text';
}

function buildBodyExcerpt(body: string, maxLength: number): string {
	//
	const flattenedBody = body.replace(/\s+/g, ' ').trim();

	if (flattenedBody.length <= maxLength) return flattenedBody;
	return `${flattenedBody.slice(0, maxLength).trim()}...`;
}

function countWords(body: string): number {
	//
	const flattenedBody = body.replace(/\s+/g, ' ').trim();

	if (flattenedBody.length === 0) return 0;
	return flattenedBody.split(' ').length;
}

function normalizeSearchText(body: string): string {
	//
	const flattenedBody = body.replace(/\s+/g, ' ').trim().toLowerCase();
	const maxLength = 24000;

	if (flattenedBody.length <= maxLength) return flattenedBody;
	return flattenedBody.slice(0, maxLength);
}

function dedupeStrings(values: string[]): string[] {
	//
	const dedupedValues: string[] = [];
	const seenValues = new Set<string>();

	for (const value of values) {
		const trimmedValue = value.trim();

		if (trimmedValue.length === 0) continue;
		if (seenValues.has(trimmedValue)) continue;

		seenValues.add(trimmedValue);
		dedupedValues.push(trimmedValue);
	}

	return dedupedValues;
}

function parseTaskTag(tag: string): TaskTag {
	//
	const separatorIndex = tag.indexOf(':');

	if (separatorIndex <= 0 || separatorIndex === tag.length - 1) {
		return {
			tag,
			key: null,
			value: tag,
		};
	}

	const key = tag.slice(0, separatorIndex).trim();
	const value = tag.slice(separatorIndex + 1).trim();

	if (key.length === 0 || value.length === 0) {
		return {
			tag,
			key: null,
			value: tag,
		};
	}

	return {
		tag,
		key,
		value,
	};
}

function buildIdToKeysMap(tasks: TaskRecord[]): Map<string, string[]> {
	//
	const idToKeys = new Map<string, string[]>();

	for (const task of tasks) {
		const keysForId = idToKeys.get(task.id);

		if (keysForId) {
			keysForId.push(task.key);
			continue;
		}

		idToKeys.set(task.id, [task.key]);
	}

	return idToKeys;
}

function resolveParentLinks(
	tasks: TaskRecord[],
	keyToTask: Map<string, TaskRecord>,
	graphEdges: TaskGraphEdge[],
): void {
	//
	for (const task of tasks) {
		const parentKey = inferFilesystemParentKey(task);

		if (parentKey === null) {
			task.parentSource = 'none';
			continue;
		}

		const parentTask = keyToTask.get(parentKey);

		if (!parentTask) {
			task.parentSource = 'none';
			graphEdges.push({
				type: 'parent',
				from: task.key,
				to: null,
				targetId: parentKey,
				resolved: false,
			});
			continue;
		}

		task.parentId = parentTask.id;
		task.parentKey = parentTask.key;
		task.parentSource = 'filesystem';

		graphEdges.push({
			type: 'parent',
			from: task.key,
			to: parentTask.key,
			targetId: parentTask.id,
			resolved: true,
		});
	}
}

function inferFilesystemParentKey(task: TaskRecord): string | null {
	//
	if (task.taskPath.length === 0) return null;

	const parentTaskPath = posix.dirname(task.taskPath);
	const normalizedParentTaskPath = parentTaskPath === '.' ? '' : parentTaskPath;

	return createTaskKey(normalizedParentTaskPath, task.taskSource);
}

function buildWarningEntries(tasks: TaskRecord[]): TaskWarningEntry[] {
	//
	const warningEntries: TaskWarningEntry[] = [];

	for (const task of tasks) {
		for (const warningMessage of task.warnings) {
			warningEntries.push({
				taskKey: task.key,
				relativePath: task.relativePath,
				message: warningMessage,
			});
		}
	}

	return warningEntries;
}

function buildSummary(tasks: TaskRecord[], warnings: TaskWarningEntry[]): BuildSummary {
	//
	return {
		totalTasks: tasks.length,
		withFrontmatter: tasks.filter((task) => task.hasFrontmatter).length,
		withoutFrontmatter: tasks.filter((task) => !task.hasFrontmatter).length,
		emptyFiles: tasks.filter((task) => task.isEmptyFile).length,
		bySource: countByKey(tasks, (task) => task.taskSource),
		bySection: countByKey(tasks, (task) => task.section),
		byStatus: countByKey(tasks, (task) => task.status),
		byBodyFormat: countByKey(tasks, (task) => task.bodyFormat),
		totalWarnings: warnings.length,
	};
}

function countByKey<T>(values: T[], keySelector: (value: T) => string): Record<string, number> {
	//
	const counts: Record<string, number> = {};

	for (const value of values) {
		const key = keySelector(value);
		const currentValue = counts[key] ?? 0;
		counts[key] = currentValue + 1;
	}

	const orderedCounts: Record<string, number> = {};

	for (const key of Object.keys(counts).sort((left, right) => left.localeCompare(right))) {
		orderedCounts[key] = counts[key];
	}

	return orderedCounts;
}

function writeOutputs(
	tasks: TaskRecord[],
	graphEdges: TaskGraphEdge[],
	idToKeys: Map<string, string[]>,
	summary: BuildSummary,
	warnings: TaskWarningEntry[],
): void {
	//
	if (!existsSync(OUTPUT_DIR)) {
		mkdirSync(OUTPUT_DIR, { recursive: true });
	}

	const generatedAt = new Date().toISOString();

	const tasksMetaPath = join(OUTPUT_DIR, 'tasks.meta.json');
	const tasksGraphPath = join(OUTPUT_DIR, 'tasks.graph.json');
	const tasksLookupPath = join(OUTPUT_DIR, 'tasks.lookup.json');
	const tasksContentPath = join(OUTPUT_DIR, 'tasks.content.json');

	const taskSummaries = tasks.map((task) => toTaskSummary(task));
	const graphNodes = tasks.map((task) => toGraphNode(task));
	const lookupPayload = buildLookupPayload(tasks, idToKeys);
	const contentEntries = tasks.map((task) => ({
		key: task.key,
		taskSource: task.taskSource,
		relativePath: task.relativePath,
		taskPath: task.taskPath,
		body: task.body,
		rawFrontmatter: task.rawFrontmatter,
	}));

	const sourcesInfo = TASK_SOURCES.map((source) => ({
		label: source.label,
		root: source.root,
		exists: existsSync(source.root),
	}));

	writeJson(tasksMetaPath, {
		version: OUTPUT_VERSION,
		generatedAt,
		sources: sourcesInfo,
		summary,
		warnings,
		tasks: taskSummaries,
	});

	writeJson(tasksGraphPath, {
		version: OUTPUT_VERSION,
		generatedAt,
		nodes: graphNodes,
		edges: graphEdges,
	});

	writeJson(tasksLookupPath, {
		version: OUTPUT_VERSION,
		generatedAt,
		...lookupPayload,
	});

	writeJson(tasksContentPath, {
		version: OUTPUT_VERSION,
		generatedAt,
		entries: contentEntries,
	});
}

function toTaskSummary(task: TaskRecord): TaskSummary {
	//
	return {
		key: task.key,
		taskSource: task.taskSource,
		id: task.id,
		title: task.title,
		declaredTitle: task.declaredTitle,
		titleSource: task.titleSource,
		status: task.status,
		priority: task.priority,
		tags: task.tags,
		tagDetails: task.tagDetails,
		parentId: task.parentId,
		parentKey: task.parentKey,
		parentSource: task.parentSource,
		created: task.created,
		updated: task.updated,
		source: task.source,
		hasFrontmatter: task.hasFrontmatter,
		bodyFormat: task.bodyFormat,
		bodyExcerpt: task.bodyExcerpt,
		bodyWordCount: task.bodyWordCount,
		bodySearch: task.bodySearch,
		headingTitle: task.headingTitle,
		extension: task.extension,
		relativePath: task.relativePath,
		absolutePath: task.absolutePath,
		directoryPath: task.directoryPath,
		taskPath: task.taskPath,
		pathSegments: task.pathSegments,
		section: task.section,
		config: task.config,
		fileBytes: task.fileBytes,
		fileMtimeMs: task.fileMtimeMs,
		fileCtimeMs: task.fileCtimeMs,
		isEmptyFile: task.isEmptyFile,
		warnings: task.warnings,
	};
}

function toGraphNode(task: TaskRecord): TaskGraphNode {
	//
	return {
		key: task.key,
		taskSource: task.taskSource,
		id: task.id,
		title: task.title,
		status: task.status,
		parentId: task.parentId,
		parentKey: task.parentKey,
		taskPath: task.taskPath,
		relativePath: task.relativePath,
		section: task.section,
	};
}

function buildLookupPayload(tasks: TaskRecord[], idToKeys: Map<string, string[]>): TaskLookupPayload {
	//
	const keyToPath: Record<string, string> = {};
	const taskPathToKey: Record<string, string> = {};
	const statusToKeys = new Map<string, string[]>();
	const tagToKeys = new Map<string, string[]>();

	for (const task of tasks) {
		keyToPath[task.key] = task.relativePath;
		taskPathToKey[task.key] = task.taskPath;
		addLookupValue(statusToKeys, task.status, task.key);

		for (const tag of task.tags) {
			addLookupValue(tagToKeys, tag, task.key);
		}
	}

	return {
		keyToPath: sortRecord(keyToPath),
		taskPathToKey: sortRecord(taskPathToKey),
		idToKeys: mapToSortedRecord(idToKeys),
		statusToKeys: mapToSortedRecord(statusToKeys),
		tagToKeys: mapToSortedRecord(tagToKeys),
		tagGroups: buildTagGroups(tasks),
	};
}

function addLookupValue(map: Map<string, string[]>, key: string, value: string): void {
	//
	const existing = map.get(key);

	if (existing) {
		existing.push(value);
		return;
	}

	map.set(key, [value]);
}

function mapToSortedRecord(map: Map<string, string[]>): Record<string, string[]> {
	//
	const record: Record<string, string[]> = {};
	const orderedKeys = Array.from(map.keys()).sort((left, right) => left.localeCompare(right));

	for (const key of orderedKeys) {
		record[key] = dedupeStrings(map.get(key) ?? []).sort((left, right) => left.localeCompare(right));
	}

	return record;
}

function sortRecord(record: Record<string, string>): Record<string, string> {
	//
	const sortedRecord: Record<string, string> = {};

	for (const key of Object.keys(record).sort((left, right) => left.localeCompare(right))) {
		sortedRecord[key] = record[key];
	}

	return sortedRecord;
}

interface TagGroupAccumulator {
	key: string | null;
	valuesByTag: Map<string, TaskTagGroupValue>;
}

function buildTagGroups(tasks: TaskRecord[]): TaskTagGroup[] {
	//
	const groupsByKey = new Map<string, TagGroupAccumulator>();

	for (const task of tasks) {
		for (const tagDetail of task.tagDetails) {
			const lookupKey = getTagGroupLookupKey(tagDetail.key);
			const existingGroup = groupsByKey.get(lookupKey);
			const group = existingGroup ?? {
				key: tagDetail.key,
				valuesByTag: new Map<string, TaskTagGroupValue>(),
			};

			if (!existingGroup) {
				groupsByKey.set(lookupKey, group);
			}

			const existingValue = group.valuesByTag.get(tagDetail.tag);

			if (existingValue) {
				existingValue.count += 1;
				continue;
			}

			group.valuesByTag.set(tagDetail.tag, {
				tag: tagDetail.tag,
				value: tagDetail.value,
				count: 1,
			});
		}
	}

	return Array.from(groupsByKey.values())
		.sort((left, right) => compareTagGroupKeys(left.key, right.key))
		.map((group) => ({
			key: group.key,
			values: Array.from(group.valuesByTag.values()).sort(compareTagGroupValues),
		}));
}

function getTagGroupLookupKey(key: string | null): string {
	//
	return key ?? '';
}

function compareTagGroupKeys(left: string | null, right: string | null): number {
	//
	const leftRank = getTagGroupRank(left);
	const rightRank = getTagGroupRank(right);

	if (leftRank !== rightRank) return leftRank - rightRank;

	const leftLabel = left ?? '';
	const rightLabel = right ?? '';
	return leftLabel.localeCompare(rightLabel);
}

function getTagGroupRank(key: string | null): number {
	//
	if (key === null) return 0;
	if (key === 'status') return 1;
	if (key === 'human') return 2;
	if (key === 'source') return 3;
	if (key === 'ticktick-list') return 4;
	if (key === 'ticktick-status') return 5;
	return 10;
}

function compareTagGroupValues(left: TaskTagGroupValue, right: TaskTagGroupValue): number {
	//
	if (left.count !== right.count) return right.count - left.count;
	return left.value.localeCompare(right.value);
}

function writeJson(filePath: string, value: unknown): void {
	//
	writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

main();
