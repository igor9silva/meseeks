import { z } from 'zod/v3';
import {
	type IntelligenceAdapter,
	type IntelligenceRunInput,
	type IntelligenceRunResult,
	type ObjectReadRange,
	type ObjectStorageAdapter,
	type SandboxAdapter,
	type SandboxRunInput,
	type TriggerIsolateAdapter,
	type TriggerIsolateInput,
	type TriggerIsolateResult,
	triggerProposalListSchema,
} from './adapters';

const daytonaExecuteResultSchema = z.object({
	stdout: z.string().default(''),
	stderr: z.string().default(''),
	exitCode: z.number().int(),
	metadata: z.record(z.unknown()).default({}),
});

const quickJsResultSchema = z.object({
	proposals: triggerProposalListSchema.default([]),
	metadata: z.record(z.unknown()).default({}),
});

const statelessIntelligenceResultSchema = z.object({
	text: z.string().default(''),
	costs: z
		.array(
			z.object({
				symbol: z.literal('USD'),
				amount: z.bigint(),
				description: z.string().min(1),
			}),
		)
		.default([]),
	providerItems: z.array(z.record(z.unknown())).default([]),
	reasoningSummaries: z.array(z.string()).default([]),
	metadata: z.record(z.unknown()).default({}),
});

export type ReactorFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type S3ObjectStorageConfig = {
	endpoint: string;
	bucket: string;
	accessKeyId: string;
	secretAccessKey: string;
	region: string;
	prefix?: string;
	fetch?: ReactorFetch;
	now?: () => Date;
};

export function createS3ObjectStorageAdapter(config: S3ObjectStorageConfig): ObjectStorageAdapter {
	//
	const runFetch = config.fetch ?? fetch;
	const now = config.now ?? (() => new Date());

	return {
		async read(pointer) {
			if (pointer.kind !== 'object') throw new Error('Object storage can only read object content pointers.');

			const key = scopedKey(config.prefix, pointer.storageKey);
			const response = await signedFetch({
				config,
				method: 'GET',
				key,
				body: new Uint8Array(),
				runFetch,
				now,
			});
			if (!response.ok) throw new Error(`Object read failed with ${response.status}.`);

			return new Uint8Array(await response.arrayBuffer());
		},
		async readRange(pointer, range) {
			if (pointer.kind !== 'object') throw new Error('Object storage can only read object content pointers.');

			const key = scopedKey(config.prefix, pointer.storageKey);
			const response = await signedFetch({
				config,
				method: 'GET',
				key,
				body: new Uint8Array(),
				range: rangeHeader(range),
				runFetch,
				now,
			});
			if (!response.ok && response.status !== 206) {
				throw new Error(`Object range read failed with ${response.status}.`);
			}

			return new Uint8Array(await response.arrayBuffer());
		},
		async write(input) {
			const key = crypto.randomUUID();
			const response = await signedFetch({
				config,
				method: 'PUT',
				key: scopedKey(config.prefix, key),
				body: input.bytes,
				contentType: input.contentType,
				runFetch,
				now,
			});
			if (!response.ok) throw new Error(`Object write failed with ${response.status}.`);

			return {
				key,
				contentType: input.contentType,
				size: input.bytes.byteLength,
			};
		},
		async delete(key) {
			const response = await signedFetch({
				config,
				method: 'DELETE',
				key: scopedKey(config.prefix, key),
				body: new Uint8Array(),
				runFetch,
				now,
			});
			if (!response.ok && response.status !== 404) {
				throw new Error(`Object delete failed with ${response.status}.`);
			}
		},
	};
}

export type DaytonaDriver = {
	id: string;
	writeFile(path: string, content: Uint8Array): Promise<void>;
	execute(command: string, options: { env: Record<string, string>; timeoutMs: number }): Promise<unknown>;
	readFile(path: string): Promise<Uint8Array>;
	close(): Promise<void>;
};

export type DaytonaSandboxConfig = {
	create(input: SandboxRunInput): Promise<DaytonaDriver>;
	declaredOutputPaths?: (input: SandboxRunInput) => string[];
};

export function createDaytonaSandboxAdapter(config: DaytonaSandboxConfig): SandboxAdapter {
	//
	return {
		async run(input) {
			const sandbox = await config.create(input);

			try {
				for (const file of input.files) {
					await sandbox.writeFile(file.path, file.content);
				}

				const rawResult = await sandbox.execute(input.command, {
					env: input.env,
					timeoutMs: input.timeoutMs,
				});
				const result = daytonaExecuteResultSchema.parse(rawResult);
				const outputPaths = config.declaredOutputPaths?.(input) ?? [];
				const declaredOutputs = [];

				for (const path of outputPaths) {
					const bytes = await sandbox.readFile(path);
					declaredOutputs.push({ path, bytes });
				}

				return {
					runId: sandbox.id,
					stdout: result.stdout,
					stderr: result.stderr,
					exitCode: result.exitCode,
					declaredOutputs,
					metadata: result.metadata,
				};
			} finally {
				await sandbox.close();
			}
		},
		async cancel() {
			// provider-specific cancellation will use the recorded run id once reusable sandboxes land.
		},
	};
}

export type QuickJsDriver = {
	evaluate(input: { code: string; context: Record<string, unknown>; timeoutMs: number }): Promise<unknown>;
};

export function createQuickJsTriggerIsolateAdapter(driver: QuickJsDriver): TriggerIsolateAdapter {
	//
	return {
		async evaluate(input: TriggerIsolateInput): Promise<TriggerIsolateResult> {
			const raw = await driver.evaluate({
				code: input.code,
				context: input.context,
				timeoutMs: input.timeoutMs,
			});
			const parsed = quickJsResultSchema.parse(raw);

			return {
				proposals: parsed.proposals,
				metadata: parsed.metadata,
			};
		},
	};
}

export type StatelessIntelligenceDriver = {
	run(input: IntelligenceRunInput & { store: false }): Promise<unknown>;
};

export function createStatelessIntelligenceAdapter(driver: StatelessIntelligenceDriver): IntelligenceAdapter {
	//
	return {
		async run(input: IntelligenceRunInput): Promise<IntelligenceRunResult> {
			const raw = await driver.run({
				...input,
				store: false,
			});
			return statelessIntelligenceResultSchema.parse(raw);
		},
	};
}

async function signedFetch(args: {
	config: S3ObjectStorageConfig;
	method: 'DELETE' | 'GET' | 'PUT';
	key: string;
	body: Uint8Array;
	contentType?: string;
	range?: string;
	runFetch: ReactorFetch;
	now: () => Date;
}) {
	//
	const url = objectUrl(args.config, args.key);
	const timestamp = awsTimestamp(args.now());
	const date = timestamp.slice(0, 8);
	const payloadHash = await sha256Hex(args.body);
	const host = url.host;
	const headers = new Headers({
		host,
		'x-amz-content-sha256': payloadHash,
		'x-amz-date': timestamp,
	});
	if (args.contentType) headers.set('content-type', args.contentType);
	if (args.range) headers.set('range', args.range);

	const signedHeaders = Array.from(headers.keys()).sort().join(';');
	const canonicalHeaders = Array.from(headers.keys())
		.sort()
		.map((name) => `${name}:${headers.get(name) ?? ''}\n`)
		.join('');
	const canonicalRequest = [
		args.method,
		url.pathname,
		url.searchParams.toString(),
		canonicalHeaders,
		signedHeaders,
		payloadHash,
	].join('\n');
	const credentialScope = `${date}/${args.config.region}/s3/aws4_request`;
	const stringToSign = [
		'AWS4-HMAC-SHA256',
		timestamp,
		credentialScope,
		await sha256Hex(new TextEncoder().encode(canonicalRequest)),
	].join('\n');
	const signingKey = await awsSigningKey({
		secretAccessKey: args.config.secretAccessKey,
		date,
		region: args.config.region,
	});
	const signature = await hmacHex(signingKey, stringToSign);
	const authorization = [
		`AWS4-HMAC-SHA256 Credential=${args.config.accessKeyId}/${credentialScope}`,
		`SignedHeaders=${signedHeaders}`,
		`Signature=${signature}`,
	].join(', ');

	headers.set('authorization', authorization);

	return await args.runFetch(url, {
		method: args.method,
		headers,
		body: args.method === 'PUT' ? arrayBufferFromBytes(args.body) : undefined,
	});
}

function rangeHeader(range: ObjectReadRange) {
	//
	if ('suffixLength' in range) return `bytes=-${range.suffixLength}`;

	const end = range.offset + range.length - 1;
	return `bytes=${range.offset}-${end}`;
}

function objectUrl(config: S3ObjectStorageConfig, key: string) {
	//
	const url = new URL(config.endpoint);
	url.pathname = `/${encodePathPart(config.bucket)}/${key.split('/').map(encodePathPart).join('/')}`;
	return url;
}

function scopedKey(prefix: string | undefined, key: string) {
	//
	if (prefix === undefined) return key;
	if (prefix === '') return key;

	return `${prefix.replace(/\/+$/, '')}/${key.replace(/^\/+/, '')}`;
}

function encodePathPart(value: string) {
	return encodeURIComponent(value).replace(/%2F/g, '/');
}

function awsTimestamp(date: Date) {
	return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

async function sha256Hex(input: Uint8Array) {
	const hash = await crypto.subtle.digest('SHA-256', arrayBufferFromBytes(input));
	return hex(new Uint8Array(hash));
}

async function awsSigningKey(args: { secretAccessKey: string; date: string; region: string }) {
	//
	const dateKey = await hmacBytes(new TextEncoder().encode(`AWS4${args.secretAccessKey}`), args.date);
	const dateRegionKey = await hmacBytes(dateKey, args.region);
	const dateRegionServiceKey = await hmacBytes(dateRegionKey, 's3');
	return await hmacBytes(dateRegionServiceKey, 'aws4_request');
}

async function hmacBytes(keyBytes: Uint8Array, value: string) {
	const key = await crypto.subtle.importKey(
		'raw',
		arrayBufferFromBytes(keyBytes),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign'],
	);
	const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
	return new Uint8Array(signature);
}

async function hmacHex(keyBytes: Uint8Array, value: string) {
	return hex(await hmacBytes(keyBytes, value));
}

function hex(bytes: Uint8Array) {
	return Array.from(bytes)
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('');
}

function arrayBufferFromBytes(bytes: Uint8Array) {
	//
	const copy: Uint8Array<ArrayBuffer> = new Uint8Array(bytes.byteLength);
	copy.set(bytes);
	return copy.buffer;
}
