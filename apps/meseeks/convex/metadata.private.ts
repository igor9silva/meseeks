export const metadataEqual = (left?: Record<string, string>, right?: Record<string, string>) =>
	JSON.stringify(left ?? {}) === JSON.stringify(right ?? {});
