import { expect, test } from 'bun:test';
import { validate } from 'convex-helpers/validators';
import { tables } from './schema';

test('accepts passkey and OAuth records from the previous component schema', () => {
	const passkey = {
		publicKey: 'public-key',
		userId: 'user',
		credentialID: 'credential',
		counter: 1,
		deviceType: 'singleDevice',
		backedUp: false,
	};
	expect(validate(tables.passkey.validator, passkey)).toBe(true);
	expect(validate(tables.oauthApplication.validator, { clientId: 'client', redirectURLs: null })).toBe(true);
	expect(validate(tables.oauthAccessToken.validator, { userId: 'user', accessToken: 'token' })).toBe(true);
	expect(validate(tables.oauthConsent.validator, { clientId: 'client', consentGiven: true })).toBe(true);
});

test('accepts missing and null rate-limit fields from the previous component schema', () => {
	expect(validate(tables.rateLimit.validator, {})).toBe(true);
	expect(validate(tables.rateLimit.validator, { key: null, count: null, lastRequest: null })).toBe(true);
});
