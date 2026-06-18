import {
	CopyObjectCommand,
	DeleteObjectCommand,
	GetObjectCommand,
	HeadObjectCommand,
	PutObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from 'schemas/envSchema';

const encoder = new TextEncoder();

const config = {
	bucket: env.OBJECT_STORAGE_BUCKET,
	rootPrefix: env.OBJECT_STORAGE_ROOT_PREFIX,
};

const client = new S3Client({
	region: env.OBJECT_STORAGE_REGION,
	endpoint: env.OBJECT_STORAGE_ENDPOINT,
	credentials: {
		accessKeyId: env.OBJECT_STORAGE_ACCESS_KEY_ID,
		secretAccessKey: env.OBJECT_STORAGE_SECRET_ACCESS_KEY,
	},
});

const uploadUrlTtlSeconds = 10 * 60;

type BodyWithTransform = {
	transformToString: () => Promise<string>;
};

export async function storeText({
	content,
	contentType,
	owner,
}: {
	content: string;
	contentType: string;
	owner: string;
}) {
	//
	const bytes = encoder.encode(content);
	const hash = await sha256Hex(bytes);
	const storageId = crypto.randomUUID();
	const storageKey = `${config.rootPrefix}/${owner}/${storageId}`;

	await client.send(
		new PutObjectCommand({
			Bucket: config.bucket,
			Key: storageKey,
			Body: bytes,
			ContentType: contentType,
		}),
	);

	return {
		hash,
		size: bytes.byteLength,
		storageKey,
	};
}

export function createCanonicalStorageKey({ owner }: { owner: string }) {
	//
	return `${config.rootPrefix}/${owner}/${crypto.randomUUID()}`;
}

export function createStagedStorageKey({ owner }: { owner: string }) {
	//
	return `${config.rootPrefix}/${owner}/.staged/${crypto.randomUUID()}`;
}

export async function createUploadUrl({
	checksum,
	contentType,
	storageKey,
}: {
	checksum: string;
	contentType: string;
	storageKey: string;
}) {
	//
	const expiresAt = Date.now() + uploadUrlTtlSeconds * 1000;
	const uploadUrl = await getSignedUrl(
		client,
		new PutObjectCommand({
			Bucket: config.bucket,
			Key: storageKey,
			ContentType: contentType,
			ChecksumSHA256: checksum,
		}),
		{ expiresIn: uploadUrlTtlSeconds },
	);

	return { uploadUrl, expiresAt };
}

export async function createReadUrl({ storageKey }: { storageKey: string }) {
	//
	const expiresAt = Date.now() + uploadUrlTtlSeconds * 1000;
	const readUrl = await getSignedUrl(
		client,
		new GetObjectCommand({
			Bucket: config.bucket,
			Key: storageKey,
		}),
		{ expiresIn: uploadUrlTtlSeconds },
	);

	return { readUrl, expiresAt };
}

export async function findBody({ storageKey }: { storageKey: string }) {
	//
	const response = await client.send(
		new HeadObjectCommand({
			Bucket: config.bucket,
			Key: storageKey,
			ChecksumMode: 'ENABLED',
		}),
	);

	return {
		checksum: response.ChecksumSHA256,
		contentLength: response.ContentLength,
		contentType: response.ContentType,
	};
}

export async function copyBody({ contentType, from, to }: { contentType: string; from: string; to: string }) {
	//
	const source = copySource(from);
	const copyUrl = await getSignedUrl(
		client,
		new CopyObjectCommand({
			Bucket: config.bucket,
			Key: to,
			CopySource: source,
			ContentType: contentType,
			MetadataDirective: 'REPLACE',
		}),
		{ expiresIn: uploadUrlTtlSeconds },
	);
	const response = await fetch(copyUrl, {
		method: 'PUT',
		headers: {
			'content-type': contentType,
			'x-amz-copy-source': source,
			'x-amz-metadata-directive': 'REPLACE',
		},
	});

	if (response.ok) return;

	throw new Error(`Object Storage copy failed with HTTP ${response.status}: ${await response.text()}`);
}

export async function readText({ storageKey }: { storageKey: string }) {
	//
	const response = await client.send(
		new GetObjectCommand({
			Bucket: config.bucket,
			Key: storageKey,
		}),
	);

	if (!isBodyWithTransform(response.Body)) throw new Error('Object Storage body is not readable as text.');

	return await response.Body.transformToString();
}

export async function deleteBody({ storageKey }: { storageKey: string }) {
	//
	await client.send(
		new DeleteObjectCommand({
			Bucket: config.bucket,
			Key: storageKey,
		}),
	);
}

function copySource(storageKey: string) {
	//
	return `${config.bucket}/${storageKey.split('/').map(encodeURIComponent).join('/')}`;
}

async function sha256Hex(bytes: Uint8Array) {
	//
	const safeBytes = new Uint8Array(bytes.byteLength);
	safeBytes.set(bytes);
	const digest = await crypto.subtle.digest('SHA-256', safeBytes);

	return Array.from(new Uint8Array(digest))
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('');
}

function isBodyWithTransform(body: unknown): body is BodyWithTransform {
	//
	if (!body) return false;
	if (typeof body !== 'object') return false;
	if (!('transformToString' in body)) return false;

	return typeof body.transformToString === 'function';
}
