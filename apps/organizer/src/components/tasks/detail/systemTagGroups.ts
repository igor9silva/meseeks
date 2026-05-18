import { compareTagGroupKeys, getTagGroupLookupKey, parseTaskTag } from '~/lib/taskTags';

export interface SystemTagGroup {
	key: string | null;
	entries: Array<{
		tag: string;
		value: string;
	}>;
}

export function buildSystemTagGroups(tags: string[]): SystemTagGroup[] {
	//
	const groupsByKey = new Map<string, SystemTagGroup>();

	for (const tag of tags) {
		const parsedTag = parseTaskTag(tag);
		const lookupKey = getTagGroupLookupKey(parsedTag.key);
		const existingGroup = groupsByKey.get(lookupKey);
		const group = existingGroup ?? {
			key: parsedTag.key,
			entries: [],
		};

		if (!existingGroup) {
			groupsByKey.set(lookupKey, group);
		}

		if (group.entries.some((entry) => entry.tag === parsedTag.tag)) continue;

		group.entries.push({
			tag: parsedTag.tag,
			value: parsedTag.value,
		});
	}

	return Array.from(groupsByKey.values())
		.sort((left, right) => compareTagGroupKeys(left.key, right.key))
		.map((group) => ({
			key: group.key,
			entries: group.entries.sort(compareSystemTagEntries),
		}));
}

function compareSystemTagEntries(
	left: SystemTagGroup['entries'][number],
	right: SystemTagGroup['entries'][number],
): number {
	//
	if (left.value !== right.value) return left.value.localeCompare(right.value);

	return left.tag.localeCompare(right.tag);
}
