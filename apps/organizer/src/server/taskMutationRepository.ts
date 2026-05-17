import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, extname, join, posix } from 'node:path';
import type { TaskConfig, TaskSummary } from '~/server/taskIndexSchemas';
import type { CreateTaskInput as ParsedCreateTaskInput } from '~/server/taskExplorerSchemas';
import { normalizeTaskFilenameSlug, normalizeTaskRenameFilenameSlug } from '~/lib/taskFilename';
import { findRepoRoot } from '~/server/repoRoot';

function getTaskRoot(taskSource: TaskSummary['taskSource']): string {
	//
	const projectRoot = findRepoRoot();

	if (taskSource === 'private') {
		return join(projectRoot, 'private', 'tasks');
	}

	return join(projectRoot, 'tasks');
}

function createTaskKey(taskPath: string, taskSource: TaskSummary['taskSource']): string {
	//
	return `${taskSource}:${taskPath}`;
}

function runTaskIndexBuild(): void {
	//
	const buildResult = spawnSync('bun', ['run', '.config/generate-task-index.ts'], {
		cwd: findRepoRoot(),
		encoding: 'utf-8',
	});

	if (buildResult.status === 0) return;

	const errorOutput = [buildResult.stdout, buildResult.stderr]
		.filter((chunk) => chunk.trim().length > 0)
		.join('\n')
		.trim();

	throw new Error(
		errorOutput.length > 0 ? `failed to rebuild task indexes\n${errorOutput}` : 'failed to rebuild task indexes',
	);
}

export interface MarkTaskDoneResult {
	newTaskKey: string;
	status: string;
}

export interface MoveTaskInput {
	status: 'backlog' | 'active' | 'completed';
}

export interface MoveTaskResult {
	newTaskKey: string;
	status: string;
}

export interface UpdateTaskSourceInput {
	taskSource: TaskSummary['taskSource'];
}

export interface UpdateTaskSourceResult {
	newTaskKey: string;
	taskSource: TaskSummary['taskSource'];
}

export interface RenameTaskInput {
	filename: string;
}

export interface RenameTaskResult {
	newTaskKey: string;
	newTaskPath: string;
}

export interface TrashTaskResult {
	trashedPath: string;
}

type TaskPriority = ParsedCreateTaskInput['priority'];
type TagMutationAction = 'add' | 'remove';

interface FrontmatterSection {
	rawFrontmatter: string;
	body: string;
}

export interface CreateTaskInput {
	body: string;
	filename: string;
	priority: TaskPriority;
	status: ParsedCreateTaskInput['status'];
	tags: string[];
	taskSource: TaskSummary['taskSource'];
	parentPath: string;
	title: string;
}

export interface CreateTaskResult {
	absolutePath: string;
	newRelativePath: string;
	newTaskKey: string;
	taskPath: string;
	taskSource: TaskSummary['taskSource'];
}

export interface UpdateTaskTagsInput {
	action: TagMutationAction;
	tag: string;
}

export interface UpdateTaskTagsResult {
	tags: string[];
}

export interface UpdateTaskPriorityInput {
	priority: TaskPriority | null;
}

export interface UpdateTaskPriorityResult {
	priority: TaskPriority | null;
}

export interface UpdateTaskTitleInput {
	title: string;
}

export interface UpdateTaskTitleResult {
	title: string;
}

export interface UpdateTaskConfigInput {
	config: TaskConfig;
}

export interface UpdateTaskConfigResult {
	config: TaskConfig;
}

function dedupeStrings(values: string[]): string[] {
	//
	const seen = new Set<string>();
	const output: string[] = [];

	for (const value of values) {
		const trimmedValue = value.trim();
		if (trimmedValue.length === 0) continue;
		if (seen.has(trimmedValue)) continue;
		seen.add(trimmedValue);
		output.push(trimmedValue);
	}

	return output;
}

function normalizeTaskTag(tag: string): string {
	//
	const normalizedTag = tag
		.trim()
		.toLowerCase()
		.replace(/[\s_]+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-+|-+$/g, '');
	const tagSegmentPattern = '[a-z0-9]+(?:-[a-z0-9]+)*';
	const tagPattern = new RegExp(`^${tagSegmentPattern}(?::${tagSegmentPattern})?$`);

	if (!tagPattern.test(normalizedTag)) {
		throw new Error('tag must use letters, numbers, hyphens, or one namespace colon');
	}

	return normalizedTag;
}

function normalizeTaskTitle(title: string): string {
	//
	const normalizedTitle = title.trim().replace(/\s+/g, ' ');

	if (normalizedTitle.length === 0) {
		throw new Error('title is required');
	}

	return normalizedTitle;
}

function createTitleFromBody(body: string): string {
	//
	const line = body
		.split('\n')
		.map((entry) => entry.trim())
		.find((entry) => entry.length > 0);

	if (!line) return 'Untitled task';

	const title = line
		.replace(/^#{1,6}\s+/, '')
		.replace(/^[-*]\s+\[[ xX]\]\s+/, '')
		.replace(/^[-*]\s+/, '')
		.replace(/\s+/g, ' ')
		.trim();

	if (title.length === 0) return 'Untitled task';
	if (!/[a-z0-9]/i.test(title)) return 'Untitled task';
	if (title.length <= 120) return title;
	return title.slice(0, 120).trim();
}

function normalizeTaskFilenameValue(value: string): string {
	//
	const slug = normalizeTaskFilenameSlug(value);

	if (slug.length === 0) {
		throw new Error('filename must include at least one letter or number');
	}

	return slug;
}

function normalizeTaskFilename(filename: string, fallbackTitle: string): string {
	//
	const rawFilename = filename.trim().length > 0 ? filename : fallbackTitle;

	return normalizeTaskFilenameValue(rawFilename);
}

function normalizeRenameTaskFilename(filename: string): string {
	//
	const normalizedFilename = normalizeTaskRenameFilenameSlug(filename);

	if (normalizedFilename.length === 0) {
		throw new Error('filename must include at least one letter or number');
	}

	return normalizedFilename;
}

function normalizeTaskPath(path: string): string {
	//
	const normalized = path
		.trim()
		.replace(/\\/g, '/')
		.replace(/\/+/g, '/')
		.replace(/^\/+|\/+$/g, '');

	if (normalized.length === 0) return '';

	const segments = normalized.split('/');

	for (const segment of segments) {
		if (segment === '.' || segment === '..') {
			throw new Error('task path cannot contain relative segments');
		}
	}

	return segments.join('/');
}

function createUniqueTaskPath(taskRoot: string, parentPath: string, slug: string): string {
	//
	for (let attempt = 1; attempt <= 1000; attempt += 1) {
		const candidateSlug = attempt === 1 ? slug : `${slug}-${attempt}`;
		const candidatePath = parentPath.length === 0 ? candidateSlug : posix.join(parentPath, candidateSlug);
		const absolutePath = join(taskRoot, ...candidatePath.split('/'));

		if (!existsSync(absolutePath)) return candidatePath;
	}

	throw new Error('could not find an available task filename');
}

function createSystemTrashPath(sourceAbsolutePath: string): string {
	//
	const trashRoot = join(homedir(), '.Trash');
	const originalFilename = basename(sourceAbsolutePath);
	const extension = extname(originalFilename);
	const filenameStem = originalFilename.slice(0, originalFilename.length - extension.length);

	mkdirSync(trashRoot, { recursive: true });

	for (let attempt = 0; attempt <= 1000; attempt += 1) {
		const candidateFilename = attempt === 0 ? originalFilename : `${filenameStem}-${attempt}${extension}`;
		const candidatePath = join(trashRoot, candidateFilename);

		if (!existsSync(candidatePath)) return candidatePath;
	}

	throw new Error('could not find an available filename in system Trash');
}

function renderFrontmatterString(value: string): string {
	//
	return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function renderTagsFrontmatterLine(tags: string[]): string {
	//
	return `tags: [${tags.join(', ')}]`;
}

function renderPriorityFrontmatterLine(priority: TaskPriority | null): string {
	//
	return priority === null ? 'priority: null' : `priority: ${priority}`;
}

function renderTaskFrontmatter(title: string, priority: TaskPriority | null, tags: string[]): string {
	//
	return [
		'---',
		`title: ${renderFrontmatterString(title)}`,
		renderPriorityFrontmatterLine(priority),
		renderTagsFrontmatterLine(tags),
		'---',
	].join('\n');
}

function renderCreatedTaskBody(title: string, body: string): string {
	//
	const trimmedBody = body.replace(/\r\n/g, '\n').trim();

	if (trimmedBody.length > 0) {
		const hasHeading = trimmedBody.split('\n').some((line) => /^#\s+/.test(line.trim()));

		if (hasHeading) return `${trimmedBody}\n`;
		return `# ${title}\n\n${trimmedBody}\n`;
	}

	return `# ${title}\n`;
}

function renderCreatedTaskFile(input: {
	body: string;
	priority: TaskPriority | null;
	tags: string[];
	title: string;
}): string {
	//
	return [
		renderTaskFrontmatter(input.title, input.priority, input.tags),
		'',
		renderCreatedTaskBody(input.title, input.body),
	].join('\n');
}

function extractFrontmatterSection(fileContent: string): FrontmatterSection | null {
	//
	const withoutBom = fileContent.replace(/^\uFEFF/, '');

	if (!withoutBom.startsWith('---\n') && withoutBom !== '---') {
		return null;
	}

	const lines = withoutBom.split('\n');

	if (lines.length === 0 || lines[0].trim() !== '---') {
		return null;
	}

	for (let index = 1; index < lines.length; index += 1) {
		if (lines[index].trim() !== '---') continue;

		return {
			rawFrontmatter: lines.slice(1, index).join('\n'),
			body: lines.slice(index + 1).join('\n'),
		};
	}

	return null;
}

function upsertFrontmatterLine(rawFrontmatter: string, key: string, nextLine: string): string {
	//
	const lines = rawFrontmatter.split('\n');

	for (let index = 0; index < lines.length; index += 1) {
		const pairMatch = lines[index].match(/^([A-Za-z0-9_.-]+)\s*:\s*(.*)$/);
		if (!pairMatch || pairMatch[1].trim() !== key) continue;

		const rawValue = pairMatch[2].trim();
		let endIndex = index + 1;

		if (rawValue.length === 0) {
			while (endIndex < lines.length) {
				if (!/^\s*-\s+/.test(lines[endIndex])) break;
				endIndex += 1;
			}
		}

		return lines.slice(0, index).concat(nextLine, lines.slice(endIndex)).join('\n');
	}

	if (rawFrontmatter.length === 0) return nextLine;
	return `${rawFrontmatter}\n${nextLine}`;
}

function renderFileContentWithTags(fileContent: string, tags: string[]): string {
	//
	const frontmatterSection = extractFrontmatterSection(fileContent);

	if (frontmatterSection === null) {
		return `---\n${renderTagsFrontmatterLine(tags)}\n---\n\n${fileContent.replace(/^\uFEFF/, '')}`;
	}

	const nextRawFrontmatter = upsertFrontmatterLine(
		frontmatterSection.rawFrontmatter,
		'tags',
		renderTagsFrontmatterLine(tags),
	);

	return `---\n${nextRawFrontmatter}\n---\n${frontmatterSection.body}`;
}

function renderFileContentWithPriority(fileContent: string, priority: TaskPriority | null): string {
	//
	const frontmatterSection = extractFrontmatterSection(fileContent);

	if (frontmatterSection === null) {
		return `---\n${renderPriorityFrontmatterLine(priority)}\n---\n\n${fileContent.replace(/^\uFEFF/, '')}`;
	}

	const nextRawFrontmatter = upsertFrontmatterLine(
		frontmatterSection.rawFrontmatter,
		'priority',
		renderPriorityFrontmatterLine(priority),
	);

	return `---\n${nextRawFrontmatter}\n---\n${frontmatterSection.body}`;
}

function renderFileContentWithTitle(fileContent: string, title: string): string {
	//
	const frontmatterSection = extractFrontmatterSection(fileContent);

	if (frontmatterSection === null) {
		return `---\ntitle: ${renderFrontmatterString(title)}\n---\n\n${fileContent.replace(/^\uFEFF/, '')}`;
	}

	const titleLine = `title: ${renderFrontmatterString(title)}`;
	const nextRawFrontmatter = upsertFrontmatterLine(frontmatterSection.rawFrontmatter, 'title', titleLine);

	return `---\n${nextRawFrontmatter}\n---\n${frontmatterSection.body}`;
}

function getTaskDirectory(task: TaskSummary): string {
	//
	const taskRoot = getTaskRoot(task.taskSource);
	if (task.taskPath.length === 0) return taskRoot;
	return join(taskRoot, ...task.taskPath.split('/'));
}

function getTaskIndexPath(task: TaskSummary): string {
	//
	return join(getTaskRoot(task.taskSource), task.relativePath);
}

function replaceStatusTag(tags: string[], status: string): string[] {
	//
	const withoutStatus = tags.filter((tag) => !tag.startsWith('status:'));
	return dedupeStrings(withoutStatus.concat(`status:${status}`));
}

export function markTaskDone(task: TaskSummary): MarkTaskDoneResult {
	//
	return moveTask(task, { status: 'completed' });
}

export function moveTask(task: TaskSummary, input: MoveTaskInput): MoveTaskResult {
	//
	if (task.status === input.status) {
		return {
			newTaskKey: task.key,
			status: input.status,
		};
	}

	const absolutePath = getTaskIndexPath(task);

	if (!existsSync(absolutePath)) {
		throw new Error(`task file no longer exists at ${absolutePath}`);
	}

	const originalContent = readFileSync(absolutePath, 'utf-8');
	const nextTags = replaceStatusTag(task.tags, input.status);
	const nextContent = renderFileContentWithTags(originalContent, nextTags);

	writeFileSync(absolutePath, nextContent, 'utf-8');

	try {
		runTaskIndexBuild();
	} catch (error) {
		writeFileSync(absolutePath, originalContent, 'utf-8');
		throw error;
	}

	return {
		newTaskKey: task.key,
		status: input.status,
	};
}

export function updateTaskSource(task: TaskSummary, input: UpdateTaskSourceInput): UpdateTaskSourceResult {
	//
	if (input.taskSource === task.taskSource) {
		return {
			newTaskKey: task.key,
			taskSource: task.taskSource,
		};
	}

	if (task.taskPath.length === 0) {
		throw new Error('visibility roots cannot be moved');
	}

	const sourceAbsolutePath = getTaskDirectory(task);
	const destinationTaskRoot = getTaskRoot(input.taskSource);
	const destinationAbsolutePath = join(destinationTaskRoot, ...task.taskPath.split('/'));

	if (!existsSync(sourceAbsolutePath)) {
		throw new Error(`task directory no longer exists at ${sourceAbsolutePath}`);
	}

	if (existsSync(destinationAbsolutePath)) {
		throw new Error(`task already exists at ${destinationAbsolutePath}`);
	}

	mkdirSync(dirname(destinationAbsolutePath), { recursive: true });
	renameSync(sourceAbsolutePath, destinationAbsolutePath);

	try {
		runTaskIndexBuild();
	} catch (error) {
		renameSync(destinationAbsolutePath, sourceAbsolutePath);
		throw error;
	}

	return {
		newTaskKey: createTaskKey(task.taskPath, input.taskSource),
		taskSource: input.taskSource,
	};
}

export function trashTask(task: TaskSummary): TrashTaskResult {
	//
	if (task.taskPath.length === 0) {
		throw new Error('visibility roots cannot be trashed');
	}

	const sourceAbsolutePath = getTaskDirectory(task);
	const destinationAbsolutePath = createSystemTrashPath(sourceAbsolutePath);

	if (!existsSync(sourceAbsolutePath)) {
		throw new Error(`task directory no longer exists at ${sourceAbsolutePath}`);
	}

	renameSync(sourceAbsolutePath, destinationAbsolutePath);

	try {
		runTaskIndexBuild();
	} catch (error) {
		renameSync(destinationAbsolutePath, sourceAbsolutePath);
		throw error;
	}

	return {
		trashedPath: destinationAbsolutePath,
	};
}

export function renameTask(task: TaskSummary, input: RenameTaskInput): RenameTaskResult {
	//
	if (task.taskPath.length === 0) {
		throw new Error('visibility roots cannot be renamed');
	}

	const filename = normalizeRenameTaskFilename(input.filename);
	const taskDirectory = getTaskDirectory(task);
	const parentPath = posix.dirname(task.taskPath);
	const normalizedParentPath = parentPath === '.' ? '' : parentPath;
	const nextTaskPath = normalizedParentPath.length === 0 ? filename : posix.join(normalizedParentPath, filename);
	const destinationAbsolutePath = join(getTaskRoot(task.taskSource), ...nextTaskPath.split('/'));

	if (nextTaskPath === task.taskPath) {
		throw new Error('task already has that name');
	}

	if (!existsSync(taskDirectory)) {
		throw new Error(`task directory no longer exists at ${taskDirectory}`);
	}

	if (existsSync(destinationAbsolutePath)) {
		throw new Error(`task already exists at ${destinationAbsolutePath}`);
	}

	mkdirSync(dirname(destinationAbsolutePath), { recursive: true });
	renameSync(taskDirectory, destinationAbsolutePath);

	try {
		runTaskIndexBuild();
	} catch (error) {
		renameSync(destinationAbsolutePath, taskDirectory);
		throw error;
	}

	return {
		newTaskPath: nextTaskPath,
		newTaskKey: createTaskKey(nextTaskPath, task.taskSource),
	};
}

export function createTask(input: CreateTaskInput): CreateTaskResult {
	//
	const title = normalizeTaskTitle(input.title.length > 0 ? input.title : createTitleFromBody(input.body));
	const normalizedTags = dedupeStrings(input.tags.map((tag) => normalizeTaskTag(tag)));
	const parentPath = normalizeTaskPath(input.parentPath.length > 0 ? input.parentPath : 'inbox');
	const taskRoot = getTaskRoot(input.taskSource);
	const filename = normalizeTaskFilename(input.filename, title);
	const taskPath = createUniqueTaskPath(taskRoot, parentPath, filename);
	const taskDirectory = join(taskRoot, ...taskPath.split('/'));
	const absolutePath = join(taskDirectory, '_index.md');
	const shouldApplyStatus = taskPath === 'tasks' || taskPath.startsWith('tasks/');
	const tags =
		shouldApplyStatus && input.status !== null ? replaceStatusTag(normalizedTags, input.status) : normalizedTags;
	const fileContent = renderCreatedTaskFile({
		body: input.body,
		priority: input.priority,
		tags,
		title,
	});

	mkdirSync(taskDirectory, { recursive: true });
	writeFileSync(absolutePath, fileContent, { encoding: 'utf-8', flag: 'wx' });

	try {
		runTaskIndexBuild();
	} catch (error) {
		rmSync(taskDirectory, { recursive: true, force: true });
		throw error;
	}

	return {
		absolutePath,
		newRelativePath: posix.join(taskPath, '_index.md'),
		newTaskKey: createTaskKey(taskPath, input.taskSource),
		taskPath,
		taskSource: input.taskSource,
	};
}

export function updateTaskTags(task: TaskSummary, input: UpdateTaskTagsInput): UpdateTaskTagsResult {
	//
	const absolutePath = getTaskIndexPath(task);

	if (!existsSync(absolutePath)) {
		throw new Error(`task file no longer exists at ${absolutePath}`);
	}

	const normalizedTag = normalizeTaskTag(input.tag);
	const currentTags = dedupeStrings(task.tags);
	const nextTags =
		input.action === 'add'
			? dedupeStrings(currentTags.concat(normalizedTag))
			: currentTags.filter((tag) => tag !== normalizedTag);

	if (nextTags.length === currentTags.length) {
		const hasSameTags = nextTags.every((tag, index) => tag === currentTags[index]);
		if (hasSameTags) return { tags: currentTags };
	}

	const originalContent = readFileSync(absolutePath, 'utf-8');
	const nextContent = renderFileContentWithTags(originalContent, nextTags);

	writeFileSync(absolutePath, nextContent, 'utf-8');

	try {
		runTaskIndexBuild();
	} catch (error) {
		writeFileSync(absolutePath, originalContent, 'utf-8');
		throw error;
	}

	return {
		tags: nextTags,
	};
}

export function updateTaskPriority(task: TaskSummary, input: UpdateTaskPriorityInput): UpdateTaskPriorityResult {
	//
	const absolutePath = getTaskIndexPath(task);

	if (!existsSync(absolutePath)) {
		throw new Error(`task file no longer exists at ${absolutePath}`);
	}

	if (input.priority === task.priority) {
		return { priority: input.priority };
	}

	const originalContent = readFileSync(absolutePath, 'utf-8');
	const nextContent = renderFileContentWithPriority(originalContent, input.priority);

	writeFileSync(absolutePath, nextContent, 'utf-8');

	try {
		runTaskIndexBuild();
	} catch (error) {
		writeFileSync(absolutePath, originalContent, 'utf-8');
		throw error;
	}

	return { priority: input.priority };
}

export function updateTaskTitle(task: TaskSummary, input: UpdateTaskTitleInput): UpdateTaskTitleResult {
	//
	const title = normalizeTaskTitle(input.title);
	const absolutePath = getTaskIndexPath(task);

	if (!existsSync(absolutePath)) {
		throw new Error(`task file no longer exists at ${absolutePath}`);
	}

	if (title === task.title) {
		return { title };
	}

	const originalContent = readFileSync(absolutePath, 'utf-8');
	const nextContent = renderFileContentWithTitle(originalContent, title);

	writeFileSync(absolutePath, nextContent, 'utf-8');

	try {
		runTaskIndexBuild();
	} catch (error) {
		writeFileSync(absolutePath, originalContent, 'utf-8');
		throw error;
	}

	return { title };
}

export function updateTaskConfig(task: TaskSummary, input: UpdateTaskConfigInput): UpdateTaskConfigResult {
	//
	const taskDirectory = getTaskDirectory(task);
	const configPath = join(taskDirectory, '_config.json');

	if (!existsSync(taskDirectory) || !statSync(taskDirectory).isDirectory()) {
		throw new Error(`task directory no longer exists at ${taskDirectory}`);
	}

	writeFileSync(configPath, `${JSON.stringify(input.config, null, 2)}\n`, 'utf-8');

	runTaskIndexBuild();

	return {
		config: input.config,
	};
}
