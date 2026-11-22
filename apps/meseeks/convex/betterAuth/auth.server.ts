import { betterAuth } from 'better-auth/minimal';
import { options } from '../../node_modules/@convex-dev/better-auth/dist/auth-options.js';

// generate the component schema with the same in-memory rate limiter meseeks uses.
export const auth = betterAuth({ ...options, rateLimit: { storage: 'memory' } });
