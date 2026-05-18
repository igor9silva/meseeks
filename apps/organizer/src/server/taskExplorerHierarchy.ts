import { ROOT_PARENT_KEY } from '~/lib/explorerSearchParams';
import type { ExplorerQuery } from '~/server/taskExplorerSchemas';
import type { TaskSummary } from '~/server/taskIndexSchemas';
import type { SnapshotResult } from '~/server/taskIndexRepository';
import { createTaskLookup } from './taskExplorerLookup';
import { compareNavigationChildren, compareTasks } from './taskExplorerSearch';

export function getDirectChildKeys(snapshotResult: SnapshotResult, parentKey: string | null): string[] {
	//
	if (parentKey === null || snapshotResult.snapshot === null) return [];

	if (parentKey === ROOT_PARENT_KEY) {
		return snapshotResult.snapshot.meta.tasks.filter((task) => task.taskPath.length === 0).map((task) => task.key);
	}

	return snapshotResult.snapshot.graph.edges
		.filter((edge) => edge.type === 'parent' && edge.to === parentKey && edge.resolved)
		.map((edge) => edge.from);
}

export function buildChildKeySet(
	snapshotResult: SnapshotResult,
	parentKey: string | null,
	minDepth: number,
	maxDepth: number,
): Set<string> | null {
	//
	if (parentKey === null || snapshotResult.snapshot === null) return null;

	const includedKeys = new Set<string>();
	let currentKeys = getDirectChildKeys(snapshotResult, parentKey);
	let currentDepth = 1;

	while (currentDepth <= maxDepth && currentKeys.length > 0) {
		const nextKeys: string[] = [];

		for (const key of currentKeys) {
			if (currentDepth >= minDepth) {
				includedKeys.add(key);
			}
			nextKeys.push(...getDirectChildKeys(snapshotResult, key));
		}

		currentKeys = nextKeys;
		currentDepth += 1;
	}

	return includedKeys;
}

export function buildHierarchyRanks(
	snapshotResult: SnapshotResult,
	parentKey: string | null,
	minDepth: number,
	maxDepth: number,
	sort: ExplorerQuery['sort'],
): Map<string, number> | null {
	//
	if (parentKey === null || snapshotResult.snapshot === null) return null;

	const taskByKey = createTaskLookup(snapshotResult.snapshot.meta.tasks);
	const ranks = new Map<string, number>();
	let nextRank = 0;

	const visit = (currentParentKey: string, currentDepth: number) => {
		if (currentDepth > maxDepth) return;

		const childTasks = getDirectChildKeys(snapshotResult, currentParentKey)
			.map((key) => taskByKey.get(key) ?? null)
			.filter((task): task is TaskSummary => task !== null)
			.sort((left, right) => {
				const navigationComparison = compareNavigationChildren(left, right, currentParentKey);
				if (navigationComparison !== 0) return navigationComparison;

				return compareTasks(left, right, sort);
			});

		for (const task of childTasks) {
			if (currentDepth >= minDepth) {
				ranks.set(task.key, nextRank);
				nextRank += 1;
			}
			visit(task.key, currentDepth + 1);
		}
	};

	visit(parentKey, 1);
	return ranks;
}
