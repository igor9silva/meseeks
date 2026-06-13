'use node';

export const boxHome = '/home/daytona';
export const workDir = `${boxHome}/work`;
export const controlDir = `${boxHome}/.pro-runtime`;
export const vfsStateDir = `${boxHome}/.pro-vfs-state`;
export const maxTriggerDepth = 3;
export const defaultTriggerTimeoutMs = 1000;
export const defaultMaxProposals = 3;
export const triggerMemoryLimitBytes = 4 * 1024 * 1024;
export const maxExecuteFileBytes = 256 * 1024;

export const textArg = (args: Record<string, unknown>, key: string, fallback = '') => {
	const value = args[key];
	if (typeof value === 'string') return value;
	return fallback;
};

export const numberArg = (args: Record<string, unknown>, key: string, fallback: number) => {
	const value = args[key];
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	return fallback;
};

export const objectOfStringsArg = (args: Record<string, unknown>, key: string) => {
	const value = args[key];
	if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

	const result: Record<string, string> = {};
	for (const [entryKey, entryValue] of Object.entries(value)) {
		if (typeof entryValue === 'string') result[entryKey] = entryValue;
	}

	return result;
};

export const errorMessage = (error: unknown) => {
	if (error instanceof Error) return error.message;
	return 'Unknown error';
};

export const shellQuote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;

export const parentDir = (path: string) => {
	const index = path.lastIndexOf('/');
	if (index <= 0) return workDir;
	return path.slice(0, index);
};

export const hashText = (content: string) => {
	let hash = 2166136261;
	for (let index = 0; index < content.length; index += 1) {
		hash ^= content.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}

	return (hash >>> 0).toString(16).padStart(8, '0');
};

export const byteSize = (content: string) => new TextEncoder().encode(content).length;
