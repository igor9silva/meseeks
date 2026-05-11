export interface ParsedTaskTag {
	tag: string;
	key: string | null;
	value: string;
}

export function parseTaskTag(tag: string): ParsedTaskTag {
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

export function formatTagGroupLabel(key: string | null): string {
	//
	return key ?? 'Tags';
}

export function getTagGroupLookupKey(key: string | null): string {
	//
	return key ?? '';
}

export function compareTagGroupKeys(left: string | null, right: string | null): number {
	//
	const leftRank = getTagGroupRank(left);
	const rightRank = getTagGroupRank(right);

	if (leftRank !== rightRank) return leftRank - rightRank;
	if (left === right) return 0;
	if (left === null) return -1;
	if (right === null) return 1;

	return left.localeCompare(right);
}

function getTagGroupRank(key: string | null): number {
	//
	if (key === null) return 0;
	if (key === 'source') return 1;
	if (key === 'ticktick-list') return 2;
	if (key === 'ticktick-status') return 3;

	return 100;
}
