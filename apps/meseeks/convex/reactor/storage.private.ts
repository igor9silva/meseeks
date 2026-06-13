'use node';

import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import type { Id } from '../_generated/dataModel';
import { env } from 'schemas/envSchema';
import { byteSize } from './utils.private';

const config = {
	bucket: env.OBJECT_STORAGE_BUCKET,
	endpoint: env.OBJECT_STORAGE_ENDPOINT,
	region: env.OBJECT_STORAGE_REGION,
	accessKeyId: env.OBJECT_STORAGE_ACCESS_KEY_ID,
	secretAccessKey: env.OBJECT_STORAGE_SECRET_ACCESS_KEY,
	rootPrefix: env.OBJECT_STORAGE_PREFIX,
};

const client = new S3Client({
	region: config.region,
	endpoint: config.endpoint,
	credentials: {
		accessKeyId: config.accessKeyId,
		secretAccessKey: config.secretAccessKey,
	},
});

const createRevisionId = () => randomUUID();

const currentBodyKey = ({ owner, revision }: { owner: Id<'users'>; revision: string }) => {
	return [config.rootPrefix, owner, revision].filter(Boolean).join('/');
};

const putObject = async ({
	key,
	body,
	contentType,
	metadata,
}: {
	key: string;
	body: string;
	contentType?: string;
	metadata: Record<string, string>;
}) => {
	await client.send(
		new PutObjectCommand({
			Bucket: config.bucket,
			Key: key,
			Body: Buffer.from(body),
			ContentType: contentType ?? 'text/plain; charset=utf-8',
			ContentLength: byteSize(body),
			Metadata: metadata,
		}),
	);
};

export const storeBody = async ({
	owner,
	actionId,
	revision = createRevisionId(),
	content,
	contentType,
}: {
	owner: Id<'users'>;
	actionId: Id<'actions'>;
	revision?: string;
	content: string;
	contentType?: string;
}) => {
	const key = currentBodyKey({ owner, revision });
	await putObject({
		key,
		body: content,
		contentType,
		metadata: {
			owner,
			action: actionId,
			revision,
		},
	});
	return key;
};

export const createReadUrl = async ({
	storageKey,
	expiresInSeconds = 60 * 60,
}: {
	storageKey: string;
	expiresInSeconds?: number;
}) =>
	await getSignedUrl(
		client,
		new GetObjectCommand({
			Bucket: config.bucket,
			Key: storageKey,
		}),
		{ expiresIn: expiresInSeconds },
	);

export const readBody = async ({ storageKey }: { storageKey?: string }) => {
	if (!storageKey) return undefined;
	const response = await client.send(
		new GetObjectCommand({
			Bucket: config.bucket,
			Key: storageKey,
		}),
	);
	if (!response.Body) return undefined;
	return await response.Body.transformToString();
};

export const deleteBody = async ({ storageKey }: { storageKey?: string }) => {
	if (!storageKey) return;
	await client.send(
		new DeleteObjectCommand({
			Bucket: config.bucket,
			Key: storageKey,
		}),
	);
};

export const deleteBodiesBestEffort = async (storageKeys: (string | undefined)[]) => {
	for (const storageKey of storageKeys) {
		if (!storageKey) continue;
		try {
			await deleteBody({ storageKey });
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.warn(`Could not delete previous Object Storage body: ${message}`);
		}
	}
};
