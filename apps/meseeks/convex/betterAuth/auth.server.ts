import { getAuthTables, type BetterAuthPluginDBSchema, type DBFieldAttribute } from 'better-auth/db';
import { betterAuth } from 'better-auth/minimal';
import { options } from '../../node_modules/@convex-dev/better-auth/dist/auth-options.js';

const { jwks, rateLimit, ...baseTables } = getAuthTables(options);
const requiredString = { type: 'string', required: true } satisfies DBFieldAttribute;
const optionalString = { type: 'string', required: false } satisfies DBFieldAttribute;
const optionalNumber = { type: 'number', required: false } satisfies DBFieldAttribute;
const optionalBoolean = { type: 'boolean', required: false } satisfies DBFieldAttribute;

// keep the deployed table order so convex generates stable model unions.
const schema = {
	...baseTables,
	passkey: {
		fields: {
			name: optionalString,
			publicKey: requiredString,
			userId: requiredString,
			credentialID: requiredString,
			counter: { type: 'number', required: true },
			deviceType: requiredString,
			backedUp: { type: 'boolean', required: true },
			transports: optionalString,
			createdAt: optionalNumber,
			aaguid: optionalString,
		},
		indexes: [{ fields: ['credentialID'] }, { fields: ['userId'] }],
	},
	oauthApplication: {
		fields: {
			name: optionalString,
			icon: optionalString,
			metadata: optionalString,
			clientId: optionalString,
			clientSecret: optionalString,
			redirectURLs: optionalString,
			type: optionalString,
			disabled: optionalBoolean,
			userId: optionalString,
			createdAt: optionalNumber,
			updatedAt: optionalNumber,
		},
		indexes: [{ fields: ['clientId'] }, { fields: ['userId'] }],
	},
	// the old oauth tables predate the current provider's authorizationCodeId and referenceId indexes.
	legacyAccessToken: {
		modelName: 'oauthAccessToken',
		fields: {
			accessToken: optionalString,
			refreshToken: optionalString,
			accessTokenExpiresAt: optionalNumber,
			refreshTokenExpiresAt: optionalNumber,
			clientId: optionalString,
			userId: optionalString,
			scopes: optionalString,
			createdAt: optionalNumber,
			updatedAt: optionalNumber,
		},
		indexes: [
			{ fields: ['accessToken'] },
			{ fields: ['refreshToken'] },
			{ fields: ['clientId'] },
			{ fields: ['userId'] },
		],
	},
	legacyConsent: {
		modelName: 'oauthConsent',
		fields: {
			clientId: optionalString,
			userId: optionalString,
			scopes: optionalString,
			createdAt: optionalNumber,
			updatedAt: optionalNumber,
			consentGiven: optionalBoolean,
		},
		indexes: [{ fields: ['clientId', 'userId'] }, { fields: ['userId'] }],
	},
	jwks,
	// the old rate-limit table permits both missing and null values.
	rateLimit: {
		...rateLimit,
		fields: {
			...rateLimit.fields,
			key: { ...rateLimit.fields.key, required: false },
			count: { ...rateLimit.fields.count, required: false },
			lastRequest: { ...rateLimit.fields.lastRequest, required: false },
		},
	},
} satisfies BetterAuthPluginDBSchema;

// the better auth cli discovers auth.server.ts. convex excludes it from deployed functions.
export const auth = betterAuth({
	database: options.database,
	plugins: [{ id: 'component-schema', schema }],
});
