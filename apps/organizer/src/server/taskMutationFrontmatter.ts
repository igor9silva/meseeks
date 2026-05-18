import type { CreateTaskInput as ParsedCreateTaskInput } from '~/server/taskExplorerSchemas';

type TaskPriority = ParsedCreateTaskInput['priority'];

interface FrontmatterSection {
	rawFrontmatter: string;
	body: string;
}

export function dedupeStrings(values: string[]): string[] {
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

export function normalizeTaskTag(tag: string): string {
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

export function normalizeTaskTitle(title: string): string {
	//
	const normalizedTitle = title.trim().replace(/\s+/g, ' ');

	if (normalizedTitle.length === 0) {
		throw new Error('title is required');
	}

	return normalizedTitle;
}

export function createTitleFromBody(body: string): string {
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

export function renderCreatedTaskFile(input: {
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

export function renderFileContentWithTags(fileContent: string, tags: string[]): string {
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

export function renderFileContentWithPriority(fileContent: string, priority: TaskPriority | null): string {
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

export function renderFileContentWithTitle(fileContent: string, title: string): string {
	//
	const frontmatterSection = extractFrontmatterSection(fileContent);

	if (frontmatterSection === null) {
		return `---\ntitle: ${renderFrontmatterString(title)}\n---\n\n${fileContent.replace(/^\uFEFF/, '')}`;
	}

	const titleLine = `title: ${renderFrontmatterString(title)}`;
	const nextRawFrontmatter = upsertFrontmatterLine(frontmatterSection.rawFrontmatter, 'title', titleLine);

	return `---\n${nextRawFrontmatter}\n---\n${frontmatterSection.body}`;
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
