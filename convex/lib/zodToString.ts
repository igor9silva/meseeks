import { z } from 'zod';
import { dezerialize, zerialize } from 'zodex';

export function zodToString(schema: z.AnyZodObject) {
	return JSON.stringify(zerialize(schema));
}

export function stringToZod(schema: string) {
	return dezerialize(JSON.parse(schema));
}
