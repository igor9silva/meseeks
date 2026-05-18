import { compareTagGroupKeys, getTagGroupLookupKey, parseTaskTag } from '~/lib/taskTags';
import type { ExplorerFacets } from '../taskExplorerTypes';

export function buildTagGroups(
	facetGroups: ExplorerFacets['tagGroups'],
	pinnedTags: string[],
): ExplorerFacets['tagGroups'] {
	//
	const groupsByKey = new Map<string, ExplorerFacets['tagGroups'][number]>();

	for (const group of facetGroups) {
		groupsByKey.set(getTagGroupLookupKey(group.key), {
			key: group.key,
			entries: group.entries.slice(),
		});
	}

	for (const tag of pinnedTags) {
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
			key: parsedTag.key,
			value: parsedTag.value,
			count: 0,
		});
	}

	return Array.from(groupsByKey.values())
		.sort((left, right) => compareTagGroupKeys(left.key, right.key))
		.map((group) => ({
			key: group.key,
			entries: group.entries.sort(compareTagFacetEntries),
		}));
}

function compareTagFacetEntries(
	left: ExplorerFacets['tagGroups'][number]['entries'][number],
	right: ExplorerFacets['tagGroups'][number]['entries'][number],
): number {
	//
	if (left.value !== right.value) return left.value.localeCompare(right.value);

	return left.tag.localeCompare(right.tag);
}
