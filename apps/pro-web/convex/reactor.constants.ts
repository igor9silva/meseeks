import { env } from 'schemas/envSchema';

// convex actions hard-timeout after 10 minutes; keep reactor work below that so cleanup has runway
export const CONVEX_ACTION_TIMEOUT_MS = 600 * 1000;
export const ACTION_TIMEOUT_MS = CONVEX_ACTION_TIMEOUT_MS - env.ACTION_TIMEOUT_BUFFER_MS;
export const TASK_ENERGY_BUFFER_PERCENT = 10n;
