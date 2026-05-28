export function useIsNew(
	creationTime: number | Date, //
	initialRenderDate: Date,
) {
	return (() => {
		return new Date(creationTime) > initialRenderDate;
	})();
}
