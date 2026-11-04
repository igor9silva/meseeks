import { readSkillSchema } from 'lib/zodToString';
import { bigintCodec, bigintOptionsSchema } from 'lib/skillJsonSchema';

export interface SchemaProperty {
	name: string;
	type: string;
	description?: string;
	required: boolean;
	constraints?: string[];
}

export function parseJsonSchemaToProperties(schema: string): SchemaProperty[] {
	//
	if (!schema.trim() || schema.trim() === '{}') return [];
	try {
		const parsed = readSkillSchema(schema);
		if (parsed.type !== 'object' || !parsed.properties) return [];

		return Object.entries(parsed.properties).map(([name, property]) => {
			if (typeof property === 'boolean')
				return { name, type: property ? 'any' : 'never', required: parsed.required?.includes(name) ?? false };
			const constraints: string[] = [];
			for (const [key, label] of [
				['minimum', 'min'],
				['maximum', 'max'],
				['minLength', 'min length'],
				['maxLength', 'max length'],
				['pattern', 'pattern'],
			]) {
				if (property[key] !== undefined) constraints.push(`${label}: ${property[key]}`);
			}
			if (property.enum) constraints.push(`options: ${property.enum.join(', ')}`);
			if (property.default !== undefined) constraints.push(`default: ${JSON.stringify(property.default)}`);
			if (property['x-codec'] === bigintCodec) {
				const bounds = bigintOptionsSchema.parse(property['x-bigint'] ?? {});
				if (bounds.minimum !== undefined) constraints.push(`min: ${bounds.minimum}`);
				if (bounds.maximum !== undefined) constraints.push(`max: ${bounds.maximum}`);
				if (bounds.exclusiveMinimum !== undefined) constraints.push(`greater than: ${bounds.exclusiveMinimum}`);
				if (bounds.exclusiveMaximum !== undefined) constraints.push(`less than: ${bounds.exclusiveMaximum}`);
			}
			return {
				name,
				type: getHumanReadableType(property.type, property['x-codec']),
				description: property.description,
				required: parsed.required?.includes(name) ?? false,
				constraints: constraints.length > 0 ? constraints : undefined,
			};
		});
	} catch (error) {
		console.error('Failed to parse JSON schema:', error);
		return [];
	}
}

function getHumanReadableType(type: unknown, codec: unknown): string {
	if (codec === bigintCodec) return 'number (bigint)';
	switch (type) {
		case 'string':
			return 'text';
		case 'number':
		case 'integer':
			return 'number';
		case 'boolean':
			return 'true or false';
		case 'array':
			return 'list';
		case 'object':
			return 'complex object';
		default:
			return typeof type === 'string' ? type : 'Unknown';
	}
}
