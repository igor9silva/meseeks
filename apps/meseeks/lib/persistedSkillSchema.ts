import { z } from 'zod';
import {
	bigintCodec,
	bigintOptionsSchema,
	fromSkillJsonSchema,
	explicitConjunctions,
	schemaVersion,
	schemaVersionKey,
	toSkillJsonSchema,
} from './skillJsonSchema';

const jsonObject = z.record(z.string(), z.json());
const schemaMapKeys = ['$defs', 'definitions', 'properties', 'patternProperties'];
const schemaArrayKeys = ['allOf', 'anyOf', 'oneOf', 'prefixItems'];
const schemaKeys = ['additionalProperties', 'additionalItems', 'propertyNames', 'contains', 'not'];
const countKeys = [
	'minLength',
	'maxLength',
	'minItems',
	'maxItems',
	'minProperties',
	'maxProperties',
	'minContains',
	'maxContains',
];
const numberKeys = ['minimum', 'maximum', 'multipleOf'];
const supportedKeywords = new Set([
	'$schema',
	'$id',
	'$ref',
	'type',
	'title',
	'description',
	'default',
	'examples',
	'enum',
	'const',
	'format',
	'pattern',
	'required',
	'items',
	'uniqueItems',
	'exclusiveMinimum',
	'exclusiveMaximum',
	'readOnly',
	'writeOnly',
	'deprecated',
	'$comment',
	'contentEncoding',
	'contentMediaType',
	schemaVersionKey,
	'x-codec',
	'x-bigint',
	'x-zod-strip',
	'x-zod-optional',
	'x-zod-readonly',
	'x-zod-prefault',
	'x-zod-tuple-length',
	...schemaMapKeys,
	...schemaArrayKeys,
	...schemaKeys,
	...countKeys,
	...numberKeys,
]);

export function zodToString(schema: z.ZodType) {
	return JSON.stringify(toSkillJsonSchema(schema));
}

export function stringToZod(schema: string): z.ZodType {
	return fromSkillJsonSchema(readSkillSchema(schema));
}

export function normalizeSkillSchema(schema: string) {
	//
	const json = readSkillSchema(schema);
	// compile before saving so unsupported documents never silently weaken validation.
	fromSkillJsonSchema(json);
	return JSON.stringify(json);
}

export function readSkillSchema(schema: string): z.core.JSONSchema.JSONSchema {
	//
	if (schema.length > 1_000_000) throw new Error('Skill schema exceeds 1 MB');
	const input: unknown = JSON.parse(schema);
	// bound the raw document before any recursive validator/converter visits it.
	const pending = [{ value: input, depth: 0 }];
	let values = 0;
	while (pending.length) {
		const item = pending.pop();
		if (!item) break;
		if (++values > 50_000 || item.depth > 64) throw new Error('Skill schema is too complex');
		if (item.value && typeof item.value === 'object') {
			for (const value of Object.values(item.value)) pending.push({ value, depth: item.depth + 1 });
		}
	}
	const parsed = jsonObject.parse(input);
	const version = parsed[schemaVersionKey];
	if (version !== undefined && version !== schemaVersion)
		throw new Error(`Unsupported skill schema version: ${version}`);
	if (version === undefined && !('$schema' in parsed))
		throw new Error('Skill schemas must declare $schema or x-meseeks-schema-version');
	const json = explicitConjunctions(parsed);
	validateSkillSchema(json);
	return {
		...json,
		[schemaVersionKey]: schemaVersion,
		$schema: json.$schema ?? 'https://json-schema.org/draft/2020-12/schema',
	};
}

function validateSkillSchema(root: z.core.JSONSchema.JSONSchema) {
	//
	let nodes = 0;
	function visit(input: unknown, depth: number) {
		//
		if (++nodes > 10_000 || depth > 64) throw new Error('Skill schema is too complex');
		if (typeof input === 'boolean') return;
		const node = z.record(z.string(), z.unknown()).parse(input);
		for (const key of Object.keys(node)) {
			if (!supportedKeywords.has(key)) throw new Error(`Unsupported JSON Schema keyword: ${key}`);
		}
		if (node.$schema !== undefined)
			z.enum([
				'https://json-schema.org/draft/2020-12/schema',
				'http://json-schema.org/draft-07/schema#',
				'http://json-schema.org/draft-04/schema#',
			]).parse(node.$schema);
		if (node.$ref !== undefined && !z.string().parse(node.$ref).startsWith('#'))
			throw new Error('External schema references are unsupported');
		if (node.type !== undefined)
			z.union([
				z.enum(['object', 'array', 'string', 'number', 'integer', 'boolean', 'null']),
				z.array(z.enum(['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'])).min(1),
			]).parse(node.type);
		if (node.required !== undefined) z.array(z.string()).parse(node.required);
		const typedConstraints = [
			'pattern',
			'format',
			'properties',
			'patternProperties',
			'additionalProperties',
			'propertyNames',
			'items',
			'prefixItems',
			'contains',
			'uniqueItems',
			...countKeys,
			...numberKeys,
			'exclusiveMinimum',
			'exclusiveMaximum',
		];
		if (node.type === undefined && typedConstraints.some((key) => key in node))
			throw new Error('Validation constraints require an explicit JSON Schema type');
		if (node.$ref !== undefined && typedConstraints.some((key) => key in node))
			throw new Error('Constraints beside $ref require an explicit allOf');
		if (node['x-zod-tuple-length'] !== undefined) z.int().nonnegative().parse(node['x-zod-tuple-length']);
		for (const key of ['pattern', 'format', 'description'])
			if (node[key] !== undefined) z.string().parse(node[key]);
		for (const key of countKeys) if (node[key] !== undefined) z.int().nonnegative().parse(node[key]);
		for (const key of numberKeys) if (node[key] !== undefined) z.number().parse(node[key]);
		if (node.multipleOf !== undefined) z.number().positive().parse(node.multipleOf);
		for (const key of ['exclusiveMinimum', 'exclusiveMaximum'])
			if (node[key] !== undefined) z.union([z.number(), z.boolean()]).parse(node[key]);
		for (const key of ['x-zod-strip', 'x-zod-optional', 'x-zod-readonly', 'x-zod-prefault', 'uniqueItems'])
			if (node[key] !== undefined) z.boolean().parse(node[key]);
		if (node['x-codec'] !== undefined) {
			z.literal(bigintCodec).parse(node['x-codec']);
			if (node.type !== 'string') throw new Error('BigInt codecs must use a decimal string schema');
			bigintOptionsSchema.parse(node['x-bigint'] ?? {});
		} else if (node['x-bigint'] !== undefined) throw new Error('BigInt constraints require a codec');
		for (const key of schemaMapKeys) {
			if (node[key] !== undefined)
				for (const child of Object.values(z.record(z.string(), z.unknown()).parse(node[key])))
					visit(child, depth + 1);
		}
		for (const key of schemaArrayKeys) {
			if (node[key] !== undefined)
				for (const child of z.array(z.unknown()).parse(node[key])) visit(child, depth + 1);
		}
		for (const key of schemaKeys) if (node[key] !== undefined) visit(node[key], depth + 1);
		if (node.items !== undefined) {
			if (Array.isArray(node.items)) for (const child of node.items) visit(child, depth + 1);
			else visit(node.items, depth + 1);
		}
	}
	visit(root, 0);
}
