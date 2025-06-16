import { useMemo } from 'react';

export function useIsNew(
	creationTime: number | Date, //
	initialRenderDate: Date,
) {
	return useMemo(() => {
		return new Date(creationTime) > initialRenderDate;
	}, [creationTime, initialRenderDate]);
}
