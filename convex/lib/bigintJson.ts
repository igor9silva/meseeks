// utilities for serializing/deserializing BigInt through JSON
// JSON doesn't support BigInt literals, so we use a marker pattern

export function bigIntToJSON(_key: string, value: unknown): unknown {
	//
	if (typeof value === 'bigint') {
		return { __bigint__: value.toString() };
	}
	return value;
}

export function bigIntFromJSON(value: unknown): unknown {
	//
	if (value === null || value === undefined) return value;

	if (Array.isArray(value)) {
		return value.map(bigIntFromJSON);
	}

	if (typeof value === 'object') {
		const obj = value as Record<string, unknown>;

		// check for BigInt marker
		if ('__bigint__' in obj && typeof obj['__bigint__'] === 'string') {
			return BigInt(obj['__bigint__']);
		}

		// recursively process object properties
		const result: Record<string, unknown> = {};
		for (const key in obj) {
			result[key] = bigIntFromJSON(obj[key]);
		}
		return result;
	}

	return value;
}
