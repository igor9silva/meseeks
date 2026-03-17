#!/usr/bin/env bun
/**
 * task index generator
 *
 * builds normalized indexes for task documents across multiple task roots.
 * scans both public tasks (tasks/) and private tasks (private/tasks/).
 * supports mdx/markdown/plain text, optional frontmatter, and malformed files.
 *
 * usage:
 *   bun run .config/tasks/generate-task-index.ts
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, posix, relative, resolve } from 'node:path';
import { z } from 'zod/v3';

const PROJECT_ROOT = resolve(__dirname, '..');
const OUTPUT_DIR = join(PROJECT_ROOT, 'private', 'tasks', '.generated');
const OUTPUT_VERSION = 2;
const VERBOSE = process.argv.includes('--verbose');

type TaskSourceLabel = 'public' | 'private';

interface TaskSource {
	label: TaskSourceLabel;
	root: string;
}

const TASK_SOURCES: TaskSource[] = [
	{ label: 'public', root: join(PROJECT_ROOT, 'tasks') },
	{ label: 'private', root: join(PROJECT_ROOT, 'private', 'tasks') },
];

const TASK_EXTENSIONS = new Set(['.md', '.mdx', '.txt', '']);

type TaskBucket = string;
type BodyFormat = 'md' | 'mdx' | 'text' | 'empty';
type FrontmatterScalar = string | number | boolean | null;
type FrontmatterValue = FrontmatterScalar | FrontmatterScalar[];

interface FrontmatterExtractionResult {
	frontmatter: Record<string, FrontmatterValue>;
	body: string;
	rawFrontmatter: string | null;
	hasFrontmatter: boolean;
	warnings: string[];
}

interface ParsedTaskFile {
	key: string;
	source: TaskSourceLabel;
	relativePath: string;
	absolutePath: string;
	extension: string;
	bucket: TaskBucket;
	frontmatter: Record<string, FrontmatterValue>;
	body: string;
	rawFrontmatter: string | null;
	hasFrontmatter: boolean;
	fileBytes: number;
	fileMtimeMs: number;
	fileCtimeMs: number;
	fileBirthtimeMs: number;
	isEmptyFile: boolean;
	warnings: string[];
}

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

type NormalizedFrontmatter = z.infer<typeof frontmatterSchema>;

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
	bucket: TaskBucket;
	relativePath: string;
	absolutePath: string;
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
	bucket: TaskBucket;
	relativePath: string;
	absolutePath: string;
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
	bucket: TaskBucket;
	relativePath: string;
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

interface BuildSummary {
	totalTasks: number;
	withFrontmatter: number;
	withoutFrontmatter: number;
	emptyFiles: number;
	bySource: Record<string, number>;
	byBucket: Record<string, number>;
	byStatus: Record<string, number>;
	byBodyFormat: Record<string, number>;
	totalWarnings: number;
}

function log(message: string): void {
	//
	if (VERBOSE) console.info(message);
}

function main(): void {
	//
	log(`building task indexes... target: ${OUTPUT_DIR}`);

	const parsedFiles: ParsedTaskFile[] = [];

	for (const taskSource of TASK_SOURCES) {
		if (!existsSync(taskSource.root)) {
			log(`skipping ${taskSource.label} source (not found): ${taskSource.root}`);
			continue;
		}

		const sourceFiles = findTaskFiles(taskSource.root);
		const sourceParsed = sourceFiles.map((absolutePath) => parseTaskFile(absolutePath, taskSource));
		parsedFiles.push(...sourceParsed);
		log(`${taskSource.label}: ${sourceParsed.length} task files`);
	}

	const taskRecords = parsedFiles.map((parsedFile) => buildTaskRecord(parsedFile));
	taskRecords.sort((left, right) => left.relativePath.localeCompare(right.relativePath));

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

function findTaskFiles(tasksRoot: string): string[] {
	//
	const files: string[] = [];
	const entries = readdirSync(tasksRoot, { withFileTypes: true });

	for (const entry of entries) {
		if (entry.name.startsWith('.')) continue;
		if (!entry.isDirectory()) continue;
		if (entry.name === '.generated') continue;

		const statusDirectory = join(tasksRoot, entry.name);
		collectTaskFiles(statusDirectory, files);
	}

	files.sort((left, right) => left.localeCompare(right));
	return files;
}

function collectTaskFiles(directoryPath: string, files: string[]): void {
	//
	const entries = readdirSync(directoryPath, { withFileTypes: true });

	for (const entry of entries) {
		if (entry.name.startsWith('.')) continue;

		const absolutePath = join(directoryPath, entry.name);

		if (entry.isDirectory()) {
			if (entry.name === '.generated') continue;
			collectTaskFiles(absolutePath, files);
			continue;
		}

		if (!entry.isFile()) continue;
		if (!isTaskFileName(entry.name)) continue;

		files.push(absolutePath);
	}
}

function isTaskFileName(fileName: string): boolean {
	//
	if (fileName.startsWith('.')) return false;

	const extension = extname(fileName).toLowerCase();

	if (!TASK_EXTENSIONS.has(extension)) return false;
	if (extension.length > 0) return true;

	const hasDotInside = fileName.includes('.');
	return !hasDotInside;
}

function parseTaskFile(absolutePath: string, taskSource: TaskSource): ParsedTaskFile {
	//
	const fileStats = statSync(absolutePath);
	const fileContent = readFileSync(absolutePath, 'utf-8');
	const normalizedContent = normalizeLineEndings(fileContent);
	const extraction = extractFrontmatter(normalizedContent);
	const relativePath = toPosixPath(relative(taskSource.root, absolutePath));
	const extension = extname(relativePath).toLowerCase();
	const key = createTaskKey(relativePath, taskSource.label);
	const bucket = inferTaskBucket(relativePath);

	return {
		key,
		source: taskSource.label,
		relativePath,
		absolutePath,
		extension,
		bucket,
		frontmatter: extraction.frontmatter,
		body: extraction.body,
		rawFrontmatter: extraction.rawFrontmatter,
		hasFrontmatter: extraction.hasFrontmatter,
		fileBytes: fileStats.size,
		fileMtimeMs: fileStats.mtimeMs,
		fileCtimeMs: fileStats.ctimeMs,
		fileBirthtimeMs: fileStats.birthtimeMs,
		isEmptyFile: normalizedContent.trim().length === 0,
		warnings: extraction.warnings,
	};
}

function normalizeLineEndings(value: string): string {
	//
	return value.replace(/\r\n/g, '\n');
}

function toPosixPath(filePath: string): string {
	//
	return filePath.split('\\').join('/');
}

function inferTaskBucket(relativePath: string): TaskBucket {
	//
	const segments = relativePath.split('/');
	const firstSegment = segments[0];

	if (firstSegment && firstSegment.length > 0) return firstSegment;

	return 'other';
}

function createTaskKey(relativePath: string, sourceLabel: TaskSourceLabel): string {
	//
	const withoutExtension = stripExtension(relativePath);
	const baseName = posix.basename(withoutExtension);

	let pathKey: string;

	if (baseName !== '_index') {
		pathKey = withoutExtension;
	} else {
		const directoryName = posix.dirname(withoutExtension);
		pathKey = directoryName === '.' ? '_index' : directoryName;
	}

	return `${sourceLabel}:${pathKey}`;
}

function stripExtension(relativePath: string): string {
	//
	const extension = extname(relativePath);

	if (extension.length === 0) return relativePath;
	return relativePath.slice(0, relativePath.length - extension.length);
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

interface ParsedFrontmatterBlock {
	frontmatter: Record<string, FrontmatterValue>;
	warnings: string[];
}

function parseFrontmatterBlock(rawFrontmatter: string): ParsedFrontmatterBlock {
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

	return {
		frontmatter,
		warnings,
	};
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
	const lowerValue = trimmedValue.toLowerCase();

	if (lowerValue === 'null' || trimmedValue === '~') return null;
	if (lowerValue === 'true') return true;
	if (lowerValue === 'false') return false;

	const hasNumberShape = /^-?(?:\d+|\d*\.\d+)$/.test(trimmedValue);

	if (hasNumberShape) {
		const numberValue = Number(trimmedValue);
		if (Number.isFinite(numberValue)) return numberValue;
	}

	const isDoubleQuoted = trimmedValue.startsWith('"') && trimmedValue.endsWith('"');
	const isSingleQuoted = trimmedValue.startsWith("'") && trimmedValue.endsWith("'");

	if (isDoubleQuoted || isSingleQuoted) return unquoteString(trimmedValue);

	return trimmedValue;
}

function unquoteString(rawValue: string): string {
	//
	if (rawValue.length < 2) return rawValue;

	const quoteCharacter = rawValue[0];
	const body = rawValue.slice(1, -1);

	if (quoteCharacter === '"') {
		return body.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
	}

	if (quoteCharacter === "'") {
		return body.replace(/\\'/g, "'").replace(/\\\\/g, '\\');
	}

	return body;
}

function normalizeOptionalString(value: unknown): unknown {
	//
	const scalar = normalizeScalarString(value);

	if (scalar === null) return undefined;
	return scalar;
}

function normalizeOptionalLowerString(value: unknown): unknown {
	//
	const scalar = normalizeScalarString(value);

	if (scalar === null) return undefined;
	return scalar.toLowerCase();
}

function normalizeStringArray(value: unknown): unknown {
	//
	if (value === undefined || value === null) return undefined;

	if (Array.isArray(value)) {
		const values: string[] = [];

		for (const item of value) {
			const scalar = normalizeScalarString(item);
			if (scalar === null) continue;
			values.push(scalar);
		}

		return dedupeStrings(values);
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

	const id = buildTaskIdFromRelativePath(parsedTask.relativePath);

	const headingTitle = extractHeadingTitle(parsedTask.body);
	const declaredTitle = frontmatter.title ?? null;
	const fallbackTitle = buildTitleFromPath(parsedTask.relativePath);
	const title = declaredTitle ?? headingTitle ?? fallbackTitle;
	const titleSource = declaredTitle ? 'frontmatter' : headingTitle ? 'heading' : 'filename';

	const status = parsedTask.bucket;

	const priority = frontmatter.priority ?? null;
	const tags = dedupeStrings(frontmatter.tags ?? []);

	const bodyFormat = inferBodyFormat(parsedTask.extension, parsedTask.body);
	const bodyExcerpt = buildBodyExcerpt(parsedTask.body, 280);
	const bodyWordCount = countWords(parsedTask.body);
	const bodySearch = normalizeSearchText(parsedTask.body);

	if (!parsedTask.hasFrontmatter) warnings.push('missing frontmatter');
	if (declaredTitle === null) warnings.push('missing title in frontmatter, using heading or filename');
	if (bodyFormat === 'empty') warnings.push('empty body');

	return {
		key: parsedTask.key,
		taskSource: parsedTask.source,
		id,
		title,
		declaredTitle,
		titleSource,
		status,
		priority,
		tags,
		parentId: null,
		parentKey: null,
		parentSource: 'none',
		created: toIsoTimestamp(resolveCreatedTimestampMs(parsedTask)),
		updated: toIsoTimestamp(parsedTask.fileMtimeMs),
		source: parsedTask.source,
		hasFrontmatter: parsedTask.hasFrontmatter,
		rawFrontmatter: parsedTask.rawFrontmatter,
		bodyFormat,
		body: parsedTask.body,
		bodyExcerpt,
		bodyWordCount,
		bodySearch,
		headingTitle,
		extension: parsedTask.extension,
		bucket: parsedTask.bucket,
		relativePath: parsedTask.relativePath,
		absolutePath: parsedTask.absolutePath,
		fileBytes: parsedTask.fileBytes,
		fileMtimeMs: parsedTask.fileMtimeMs,
		fileCtimeMs: parsedTask.fileCtimeMs,
		isEmptyFile: parsedTask.isEmptyFile,
		warnings,
	};
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

function buildTitleFromPath(relativePath: string): string {
	//
	const withoutExtension = stripExtension(relativePath);
	const baseName = posix.basename(withoutExtension);
	const normalizedName = baseName === '_index' ? posix.basename(posix.dirname(withoutExtension)) : baseName;
	const title = normalizedName.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();

	if (title.length > 0) return title;

	return 'untitled';
}

function buildTaskIdFromRelativePath(relativePath: string): string {
	//
	const withoutExtension = stripExtension(relativePath);
	const baseName = posix.basename(withoutExtension);

	if (baseName !== '_index') return withoutExtension;

	const directoryName = posix.dirname(withoutExtension);
	if (directoryName === '.') return '_index';
	return directoryName;
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
		const parentKey = inferFilesystemParentKey(task, keyToTask);

		if (parentKey === null) {
			task.parentSource = 'none';
			continue;
		}

		const parentTask = keyToTask.get(parentKey);

		if (!parentTask) {
			task.parentSource = 'none';
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

function inferFilesystemParentKey(task: TaskRecord, keyToTask: Map<string, TaskRecord>): string | null {
	//
	const pathWithoutExtension = stripExtension(task.relativePath);
	const baseName = posix.basename(pathWithoutExtension);
	let directoryPath =
		baseName === '_index' ? posix.dirname(pathWithoutExtension) : posix.dirname(pathWithoutExtension);

	if (baseName === '_index') {
		directoryPath = posix.dirname(directoryPath);
	}

	while (directoryPath !== '.' && directoryPath.length > 0) {
		const candidateKey = `${task.taskSource}:${directoryPath}`;

		if (candidateKey !== task.key && keyToTask.has(candidateKey)) {
			return candidateKey;
		}

		directoryPath = posix.dirname(directoryPath);
	}

	return null;
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
		byBucket: countByKey(tasks, (task) => task.bucket),
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
		body: task.body,
		rawFrontmatter: task.rawFrontmatter,
	}));

	const sourcesInfo = TASK_SOURCES.map((s) => ({ label: s.label, root: s.root, exists: existsSync(s.root) }));

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
		bucket: task.bucket,
		relativePath: task.relativePath,
		absolutePath: task.absolutePath,
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
		bucket: task.bucket,
		relativePath: task.relativePath,
	};
}

interface TaskLookupPayload {
	keyToPath: Record<string, string>;
	idToKeys: Record<string, string[]>;
	statusToKeys: Record<string, string[]>;
	tagToKeys: Record<string, string[]>;
}

function buildLookupPayload(tasks: TaskRecord[], idToKeys: Map<string, string[]>): TaskLookupPayload {
	//
	const keyToPath: Record<string, string> = {};
	const statusToKeys = new Map<string, string[]>();
	const tagToKeys = new Map<string, string[]>();

	for (const task of tasks) {
		keyToPath[task.key] = task.relativePath;
		addLookupValue(statusToKeys, task.status, task.key);

		for (const tag of task.tags) {
			addLookupValue(tagToKeys, tag, task.key);
		}
	}

	const orderedKeyToPath: Record<string, string> = {};

	for (const key of Object.keys(keyToPath).sort((left, right) => left.localeCompare(right))) {
		orderedKeyToPath[key] = keyToPath[key];
	}

	return {
		keyToPath: orderedKeyToPath,
		idToKeys: mapToSortedRecord(idToKeys),
		statusToKeys: mapToSortedRecord(statusToKeys),
		tagToKeys: mapToSortedRecord(tagToKeys),
	};
}

function addLookupValue(valuesMap: Map<string, string[]>, key: string, value: string): void {
	//
	const existingValues = valuesMap.get(key);

	if (existingValues) {
		existingValues.push(value);
		return;
	}

	valuesMap.set(key, [value]);
}

function mapToSortedRecord(valuesMap: Map<string, string[]>): Record<string, string[]> {
	//
	const outputRecord: Record<string, string[]> = {};
	const sortedKeys = Array.from(valuesMap.keys()).sort((left, right) => left.localeCompare(right));

	for (const key of sortedKeys) {
		const values = valuesMap.get(key);
		if (!values) continue;

		outputRecord[key] = dedupeStrings(values).sort((left, right) => left.localeCompare(right));
	}

	return outputRecord;
}

function writeJson(filePath: string, payload: unknown): void {
	//
	writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
}

main();
