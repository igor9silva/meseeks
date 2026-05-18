import type { TaskSource } from '~/lib/explorerSearchParams';
import type { TaskConfigColumn } from '~/server/taskIndexSchemas';

type ColumnMatchType = TaskConfigColumn['match']['type'];

export function validateColumns(columns: TaskConfigColumn[]): boolean {
	//
	for (const column of columns) {
		if (column.label.trim().length === 0) return false;
		if (column.match.type === 'tag' && column.match.tag.trim().length === 0) return false;
	}

	return true;
}

export function normalizeColumns(columns: TaskConfigColumn[]): TaskConfigColumn[] {
	//
	return columns.map((column) => {
		if (column.match.type === 'tag') {
			return {
				...column,
				label: column.label.trim(),
				match: {
					type: 'tag',
					tag: column.match.tag.trim(),
				},
			};
		}

		return {
			...column,
			label: column.label.trim(),
		};
	});
}

export function createDefaultColumn(columns: TaskConfigColumn[]): TaskConfigColumn {
	//
	const label = 'New column';

	return {
		id: createColumnId(label, columns),
		label,
		match: {
			type: 'tag',
			tag: 'status:backlog',
		},
	};
}

export function parseColumnMatchType(value: string): ColumnMatchType | null {
	//
	if (value === 'tag') return 'tag';
	if (value === 'source') return 'source';
	return null;
}

export function parseColumnSource(value: string): TaskSource | null {
	//
	if (value === 'public') return 'public';
	if (value === 'private') return 'private';
	return null;
}

export function createColumnMatchForType(
	matchType: ColumnMatchType,
	column: TaskConfigColumn,
): TaskConfigColumn['match'] {
	//
	if (matchType === 'tag') {
		return {
			type: 'tag',
			tag: column.match.type === 'tag' ? column.match.tag : 'status:backlog',
		};
	}

	return {
		type: 'source',
		source: column.match.type === 'source' ? column.match.source : 'public',
	};
}

function createColumnId(label: string, columns: TaskConfigColumn[]): string {
	//
	const baseId = slugifyColumnId(label) || 'column';
	const usedIds = new Set(columns.map((column) => column.id));
	if (!usedIds.has(baseId)) return baseId;

	let suffix = 2;
	while (true) {
		const candidateId = `${baseId}-${suffix}`;
		if (!usedIds.has(candidateId)) return candidateId;
		suffix += 1;
	}
}

function slugifyColumnId(label: string): string {
	//
	return label
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}
