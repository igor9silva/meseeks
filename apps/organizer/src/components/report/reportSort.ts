export type SortDirection = 'asc' | 'desc';

export interface SortState {
	key: string;
	direction: SortDirection;
}

export function nextSort<TSort extends SortState>(current: TSort, key: TSort['key']): TSort {
	//
	const direction = current.key === key && current.direction === 'desc' ? 'asc' : 'desc';

	return {
		...current,
		key,
		direction,
	};
}

export function compareValues(left: string | number, right: string | number, direction: SortDirection) {
	//
	let result = 0;

	if (typeof left === 'number' && typeof right === 'number') {
		result = left - right;
	} else {
		result = String(left).localeCompare(String(right));
	}

	if (direction === 'desc') return result * -1;
	return result;
}
