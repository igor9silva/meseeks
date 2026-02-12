import { zid } from 'convex-helpers/server/zod';
import { z } from 'zod';
import { asBigInt } from 'lib/money';
import { authorSchema } from './authorSchema';

export const blockchainSchema = z.enum([
	'ethereum', //
	'base',
	'worldchain',
	'optimism',
]);

export const tokenSchema = z.enum([
	'USD', //
]);

export const topUpStatusSchema = z.enum([
	'waiting', //
	'confirmed',
	'failed',
	'discarded by user',
]);

export const walletAddressSchema = z.string().describe('The address of the recipient.');

export const topUpAmountSchema = z
	.bigint()
	.min(asBigInt({ dollars: 10 }), 'Minimum amount is 10 USD')
	.max(asBigInt({ dollars: 100000 }), 'That much? Are you sure?');

export const topUpSchema = z
	.object({
		chain: blockchainSchema,
		symbol: tokenSchema,
		amount: topUpAmountSchema,
		to: walletAddressSchema,
		description: z.string(),
		status: topUpStatusSchema,
		owner: zid('users'),
		author: authorSchema,
		paymentUrl: z.string().url().describe('The URL the user will be redirected to pay.'),
		paymentId: z.string().describe('The ID of the Polar checkout.'),
	})
	.describe('A topUp to be executed on the blockchain.');
