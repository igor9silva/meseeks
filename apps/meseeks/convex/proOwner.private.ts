import { zid } from 'convex-helpers/server/zod3';
import { env } from 'schemas/envSchema';
import type { Id } from './_generated/dataModel';

export function configuredProOwner(): Id<'users'> | undefined {
	//
	const parsed = zid('users').safeParse(env.PRO_OWNER_USER_ID);
	if (!parsed.success) return undefined;

	return parsed.data;
}
