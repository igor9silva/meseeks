import { z } from 'zod';
import { bigintJsonSchema, bigintOptionsSchema } from './skillJsonSchema';

const object = z.record(z.string(), z.unknown());
const count = z.int().nonnegative();
const common = ['type', 'description', 'isOptional', 'isNullable', 'defaultValue', 'readonly'];

// temporary reader for zodex 3 documents. remove only after the backfill is verified in every environment.
export function convertLegacySkillSchema(input: unknown): z.core.JSONSchema.JSONSchema {
	//
	const references = new Map<string, string>();
	const definitions: Record<string, z.core.JSONSchema.JSONSchema> = {};

	function convert(value: unknown, path: string): z.core.JSONSchema.JSONSchema {
		//
		const shape = object.parse(value);
		// audited empty root documents meant parameterless skills; this repair was explicitly approved.
		if (path === '#' && Object.keys(shape).length === 0)
			return { 'type': 'object', 'properties': {}, 'required': [], 'x-zod-strip': true };
		if ('$ref' in shape) {
			const reference = z.string().parse(shape.$ref);
			if (reference === '#') return { $ref: '#' };
			if (!reference.startsWith('#/')) throw new Error(`${path}: external references are unsupported`);
			const name = references.get(reference) ?? `legacy${references.size}`;
			references.set(reference, name);
			return { $ref: `#/$defs/${name}` };
		}
		const type = z.string().parse(shape.type);
		let json: z.core.JSONSchema.JSONSchema;
		let fields: string[] = [];

		switch (type) {
			case 'string': {
				fields = [
					'min',
					'max',
					'length',
					'startsWith',
					'endsWith',
					'includes',
					'position',
					'regex',
					'flags',
					'kind',
					'enum',
				];
				let schema = z.string();
				if (shape.min !== undefined) schema = schema.min(count.parse(shape.min));
				if (shape.max !== undefined) schema = schema.max(count.parse(shape.max));
				if (shape.length !== undefined) schema = schema.length(count.parse(shape.length));
				if (shape.startsWith !== undefined) schema = schema.startsWith(z.string().parse(shape.startsWith));
				if (shape.endsWith !== undefined) schema = schema.endsWith(z.string().parse(shape.endsWith));
				if (shape.includes !== undefined) {
					schema = schema.includes(z.string().parse(shape.includes), {
						position: shape.position === undefined ? undefined : count.parse(shape.position),
					});
				}
				if (shape.flags) throw new Error(`${path}: regex flags need an explicit conversion`);
				if (shape.regex !== undefined) schema = schema.regex(new RegExp(z.string().parse(shape.regex)));
				if (shape.kind !== undefined) {
					switch (shape.kind) {
						case 'email':
							schema = schema.email();
							break;
						case 'url':
							schema = schema.url();
							break;
						// zod 3 accepted every uuid version/variant, including pre-existing nonstandard ids.
						case 'uuid':
							schema = schema.regex(
								/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
							);
							break;
						case 'cuid':
							schema = schema.cuid();
							break;
						case 'cuid2':
							schema = schema.cuid2();
							break;
						case 'ulid':
							schema = schema.ulid();
							break;
						case 'emoji':
							schema = schema.emoji();
							break;
						case 'base64':
							schema = schema.base64();
							break;
						case 'base64url':
							schema = schema.base64url();
							break;
						case 'duration':
							schema = schema.duration();
							break;
						default:
							throw new Error(`${path}: unsupported string format ${shape.kind}`);
					}
				}
				json = z.toJSONSchema(schema, { io: 'input' });
				delete json.$schema;
				if (shape.enum !== undefined) {
					// audited hybrid documents used this json schema keyword; enforce it without losing string checks.
					json = { allOf: [json, { type: 'string', enum: z.array(z.string()).min(1).parse(shape.enum) }] };
				}
				break;
			}
			case 'number': {
				fields = ['min', 'max', 'minInclusive', 'maxInclusive', 'multipleOf', 'int', 'finite'];
				json = { type: 'number' };
				if (shape.min !== undefined) {
					json[shape.minInclusive ? 'minimum' : 'exclusiveMinimum'] = z.number().parse(shape.min);
				}
				if (shape.max !== undefined) {
					json[shape.maxInclusive ? 'maximum' : 'exclusiveMaximum'] = z.number().parse(shape.max);
				}
				if (shape.multipleOf !== undefined) json.multipleOf = z.number().positive().parse(shape.multipleOf);
				// zod 3's int() did not impose zod 4's safe-integer bounds.
				if (shape.int) json.allOf = [{ type: 'number', multipleOf: 1 }];
				break;
			}
			case 'bigInt': {
				fields = ['min', 'max', 'minInclusive', 'maxInclusive', 'multipleOf'];
				const options: z.infer<typeof bigintOptionsSchema> = {};
				if (shape.min !== undefined)
					options[shape.minInclusive ? 'minimum' : 'exclusiveMinimum'] = z.string().parse(shape.min);
				if (shape.max !== undefined)
					options[shape.maxInclusive ? 'maximum' : 'exclusiveMaximum'] = z.string().parse(shape.max);
				if (shape.multipleOf !== undefined) options.multipleOf = [z.string().parse(shape.multipleOf)];
				json = bigintJsonSchema(bigintOptionsSchema.parse(options));
				break;
			}
			case 'boolean':
				json = { type: 'boolean' };
				break;
			case 'null':
				json = { type: 'null' };
				break;
			case 'unknown':
			case 'any':
				json = {};
				break;
			case 'never':
				json = { not: {} };
				break;
			case 'literal': {
				fields = ['value'];
				json = { const: z.union([z.string(), z.number(), z.boolean(), z.null()]).parse(shape.value) };
				break;
			}
			case 'enum': {
				fields = ['values'];
				json = { type: 'string', enum: z.array(z.string()).min(1).parse(shape.values) };
				break;
			}
			case 'nativeEnum': {
				fields = ['values'];
				const values = z.record(z.string(), z.union([z.string(), z.number()])).parse(shape.values);
				json = z.toJSONSchema(z.enum(values));
				delete json.$schema;
				break;
			}
			case 'object': {
				fields = ['properties', 'unknownKeys', 'catchall', 'required'];
				const properties = object.parse(shape.properties);
				json = {
					type: 'object',
					properties: Object.fromEntries(
						Object.entries(properties).map(([key, child]) => [
							key,
							convert(child, `${path}/properties/${key}`),
						]),
					),
					required: Object.entries(properties)
						.filter(([, child]) => {
							const field = object.parse(child);
							return (
								!field.isOptional &&
								!('defaultValue' in field) &&
								!['any', 'unknown'].includes(String(field.type))
							);
						})
						.map(([key]) => key),
				};
				if (shape.required !== undefined) {
					// zodex ignored required; only accept redundant lists so optional/default behavior cannot change.
					const required = z.array(z.string()).parse(shape.required);
					const inferred = json.required ?? [];
					if (
						new Set(required).size !== required.length ||
						required.length !== inferred.length ||
						required.some((key) => !inferred.includes(key))
					)
						throw new Error(`${path}: required conflicts with legacy property optionality`);
				}
				if (shape.catchall) json.additionalProperties = convert(shape.catchall, `${path}/catchall`);
				else if (shape.unknownKeys === 'strict') json.additionalProperties = false;
				else if (shape.unknownKeys === 'passthrough') json.additionalProperties = true;
				else json['x-zod-strip'] = true;
				break;
			}
			case 'array': {
				fields = ['element', 'minLength', 'maxLength'];
				json = { type: 'array', items: convert(shape.element, `${path}/element`) };
				if (shape.minLength !== undefined) json.minItems = count.parse(shape.minLength);
				if (shape.maxLength !== undefined) json.maxItems = count.parse(shape.maxLength);
				break;
			}
			case 'record': {
				fields = ['key', 'value'];
				json = {
					type: 'object',
					propertyNames: convert(shape.key, `${path}/key`),
					additionalProperties: convert(shape.value, `${path}/value`),
				};
				break;
			}
			case 'tuple': {
				fields = ['items', 'rest'];
				const items = z.array(z.unknown()).parse(shape.items);
				json = {
					'type': 'array',
					'prefixItems': items.map((item, i) => convert(item, `${path}/items/${i}`)),
					'minItems': items.length,
					'x-zod-tuple-length': items.length,
				};
				if (shape.rest) json.items = convert(shape.rest, `${path}/rest`);
				else json.maxItems = items.length;
				break;
			}
			case 'union':
			case 'discriminatedUnion': {
				fields = ['options', 'discriminator'];
				json = {
					anyOf: z
						.array(z.unknown())
						.min(1)
						.parse(shape.options)
						.map((item, i) => convert(item, `${path}/options/${i}`)),
				};
				break;
			}
			case 'intersection': {
				fields = ['left', 'right'];
				json = { allOf: [convert(shape.left, `${path}/left`), convert(shape.right, `${path}/right`)] };
				break;
			}
			case 'effect': {
				// the original reader never registered effect implementations, so they were ignored.
				fields = ['inner', 'effects'];
				json = convert(shape.inner, `${path}/inner`);
				break;
			}
			default:
				throw new Error(`${path}: unsupported legacy schema type ${type}`);
		}
		const allowed = new Set(common.concat(fields));
		for (const key of Object.keys(shape)) {
			if (!allowed.has(key)) throw new Error(`${path}: unsupported legacy option ${key}`);
		}
		if (shape.isNullable) json = { anyOf: [json, { type: 'null' }] };
		if ('defaultValue' in shape) {
			json.default = shape.defaultValue;
			json['x-zod-prefault'] = true;
		}
		if (shape.isOptional) json['x-zod-optional'] = true;
		if (shape.readonly) json['x-zod-readonly'] = true;
		if (shape.description !== undefined) json.description = z.string().parse(shape.description);
		return json;
	}

	const result = convert(input, '#');
	for (const [pointer, name] of references) {
		let target = input;
		for (const part of pointer.slice(2).split('/')) {
			const key = part.replace(/~1/g, '/').replace(/~0/g, '~');
			if (Array.isArray(target)) target = target[count.parse(Number(key))];
			else {
				const container = object.parse(target);
				if (!Object.prototype.hasOwnProperty.call(container, key))
					throw new Error(`Unresolved legacy reference: ${pointer}`);
				target = container[key];
			}
		}
		definitions[name] = convert(target, pointer);
	}
	if (references.size) result.$defs = definitions;
	return result;
}
