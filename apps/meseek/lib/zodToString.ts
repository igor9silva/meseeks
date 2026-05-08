import { z } from 'zod/v3';
import { dezerialize, zerialize } from 'zodex';

export function zodToString(schema: z.ZodTypeAny) {
	return JSON.stringify(zerialize(schema));
}

export function stringToZod(schema: string): z.ZodTypeAny {
	return dezerialize(JSON.parse(schema));
}
