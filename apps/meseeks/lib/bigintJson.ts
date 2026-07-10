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

	if (isRecord(value)) {
		//
		// check for BigInt marker
		if (typeof value['__bigint__'] === 'string') {
			return BigInt(value['__bigint__']);
		}

		// recursively process object properties
		const result: Record<string, unknown> = {};
		for (const key in value) {
			result[key] = bigIntFromJSON(value[key]);
		}

		return result;
	}

	return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
