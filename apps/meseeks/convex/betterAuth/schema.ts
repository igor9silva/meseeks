import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { tables as generatedTables } from 'schemas/betterAuth/schema';

// keep the original table order so convex codegen preserves the order of the adapter's model unions.
const { jwks, rateLimit, ...coreTables } = generatedTables;
const rateLimitFields = rateLimit.validator.fields;

export const tables = {
	// regenerate the adapter's built-in tables with `bun run auth:schema` from the app directory.
	...coreTables,
	// the previous component declared passkey and oauth tables that the current adapter omits.
	passkey: defineTable({
		name: v.optional(v.union(v.null(), v.string())),
		publicKey: v.string(),
		userId: v.string(),
		credentialID: v.string(),
		counter: v.number(),
		deviceType: v.string(),
		backedUp: v.boolean(),
		transports: v.optional(v.union(v.null(), v.string())),
		createdAt: v.optional(v.union(v.null(), v.number())),
		aaguid: v.optional(v.union(v.null(), v.string())),
	})
		.index('credentialID', ['credentialID'])
		.index('userId', ['userId']),
	oauthApplication: defineTable({
		name: v.optional(v.union(v.null(), v.string())),
		icon: v.optional(v.union(v.null(), v.string())),
		metadata: v.optional(v.union(v.null(), v.string())),
		clientId: v.optional(v.union(v.null(), v.string())),
		clientSecret: v.optional(v.union(v.null(), v.string())),
		redirectURLs: v.optional(v.union(v.null(), v.string())),
		type: v.optional(v.union(v.null(), v.string())),
		disabled: v.optional(v.union(v.null(), v.boolean())),
		userId: v.optional(v.union(v.null(), v.string())),
		createdAt: v.optional(v.union(v.null(), v.number())),
		updatedAt: v.optional(v.union(v.null(), v.number())),
	})
		.index('clientId', ['clientId'])
		.index('userId', ['userId']),
	oauthAccessToken: defineTable({
		accessToken: v.optional(v.union(v.null(), v.string())),
		refreshToken: v.optional(v.union(v.null(), v.string())),
		accessTokenExpiresAt: v.optional(v.union(v.null(), v.number())),
		refreshTokenExpiresAt: v.optional(v.union(v.null(), v.number())),
		clientId: v.optional(v.union(v.null(), v.string())),
		userId: v.optional(v.union(v.null(), v.string())),
		scopes: v.optional(v.union(v.null(), v.string())),
		createdAt: v.optional(v.union(v.null(), v.number())),
		updatedAt: v.optional(v.union(v.null(), v.number())),
	})
		.index('accessToken', ['accessToken'])
		.index('refreshToken', ['refreshToken'])
		.index('clientId', ['clientId'])
		.index('userId', ['userId']),
	oauthConsent: defineTable({
		clientId: v.optional(v.union(v.null(), v.string())),
		userId: v.optional(v.union(v.null(), v.string())),
		scopes: v.optional(v.union(v.null(), v.string())),
		createdAt: v.optional(v.union(v.null(), v.number())),
		updatedAt: v.optional(v.union(v.null(), v.number())),
		consentGiven: v.optional(v.union(v.null(), v.boolean())),
	})
		.index('clientId_userId', ['clientId', 'userId'])
		.index('userId', ['userId']),
	jwks,
	// older rate-limit rows permit missing or null fields, including the indexed key and timestamp.
	rateLimit: defineTable({
		...rateLimitFields,
		key: v.optional(v.union(v.null(), rateLimitFields.key)),
		count: v.optional(v.union(v.null(), rateLimitFields.count)),
		lastRequest: v.optional(v.union(v.null(), rateLimitFields.lastRequest)),
	})
		.index('key', ['key'])
		.index('lastRequest', ['lastRequest']),
};

const schema = defineSchema(tables);

export default schema;
