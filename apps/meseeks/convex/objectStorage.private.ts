import { env, objectStoragePrefix } from 'schemas/envSchema';
import { createS3ObjectStorageAdapter } from 'lib/reactor/runtimeAdapters';

export function createConfiguredObjectStorageAdapter() {
	//
	const endpoint = env.OBJECT_STORAGE_ENDPOINT ?? env.R2_ENDPOINT;
	const bucket = env.OBJECT_STORAGE_BUCKET ?? env.R2_BUCKET;
	const accessKeyId = env.OBJECT_STORAGE_ACCESS_KEY_ID ?? env.R2_ACCESS_KEY_ID;
	const secretAccessKey = env.OBJECT_STORAGE_SECRET_ACCESS_KEY ?? env.R2_SECRET_ACCESS_KEY;

	if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
		throw new Error('Object storage is not configured.');
	}

	return createS3ObjectStorageAdapter({
		endpoint,
		bucket,
		accessKeyId,
		secretAccessKey,
		region: env.OBJECT_STORAGE_REGION ?? env.R2_REGION ?? 'auto',
		prefix: objectStoragePrefix(),
	});
}
