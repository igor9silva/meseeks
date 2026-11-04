import { z } from 'zod';

export const schemaVersionKey = 'x-meseeks-schema-version';
export const schemaVersion = 1;
export const bigintCodec = 'bigint-decimal-v1';

const decimalPattern = '^-?(0|[1-9][0-9]*)$';
const decimal = z.string().regex(new RegExp(decimalPattern));
export const bigintOptionsSchema = z.strictObject({
	minimum: decimal.optional(),
	maximum: decimal.optional(),
	exclusiveMinimum: decimal.optional(),
	exclusiveMaximum: decimal.optional(),
	multipleOf: z.array(decimal.refine((value) => BigInt(value) !== 0n)).optional(),
});

export function bigintJsonSchema(options: z.infer<typeof bigintOptionsSchema> = {}) {
	return {
		'type': 'string' as const,
		'pattern': decimalPattern,
		'x-codec': bigintCodec,
		'x-bigint': options,
	};
}

export function toSkillJsonSchema(schema: z.ZodType) {
	//
	// zod is pinned because bigint checks and hydration below depend on its schema definitions.
	// regression coverage: skills/inputSchema.test.ts and lib/persistedSkillSchema.test.ts.
	const json = z.toJSONSchema(schema, {
		io: 'input',
		unrepresentable: ({ zodSchema }) => {
			if (zodSchema instanceof z.ZodBigInt) {
				const options: z.infer<typeof bigintOptionsSchema> = {};
				if (zodSchema.minValue !== null) options.minimum = String(zodSchema.minValue);
				if (zodSchema.maxValue !== null) options.maximum = String(zodSchema.maxValue);
				for (const check of zodSchema.def.checks ?? []) {
					const def = check._zod.def;
					if (def.check === 'greater_than' && 'value' in def && typeof def.value === 'bigint') {
						const key = 'inclusive' in def && def.inclusive ? 'minimum' : 'exclusiveMinimum';
						const previous = options[key];
						if (previous === undefined || def.value > BigInt(previous)) options[key] = String(def.value);
					} else if (def.check === 'less_than' && 'value' in def && typeof def.value === 'bigint') {
						const key = 'inclusive' in def && def.inclusive ? 'maximum' : 'exclusiveMaximum';
						const previous = options[key];
						if (previous === undefined || def.value < BigInt(previous)) options[key] = String(def.value);
					} else if (def.check === 'multiple_of' && 'value' in def && typeof def.value === 'bigint') {
						options.multipleOf = (options.multipleOf ?? []).concat(String(def.value));
					} else {
						throw new Error(`Unsupported BigInt check: ${def.check}`);
					}
				}
				return bigintJsonSchema(options);
			}
			if (zodSchema instanceof z.ZodDefault && typeof zodSchema.def.defaultValue === 'bigint') {
				let inner = zodSchema.unwrap();
				while (
					inner instanceof z.ZodOptional ||
					inner instanceof z.ZodNullable ||
					inner instanceof z.ZodReadonly
				)
					inner = inner.unwrap();
				if (inner instanceof z.ZodBigInt) return { default: String(zodSchema.def.defaultValue) };
			}
			return 'throw';
		},
		override: ({ zodSchema, jsonSchema }) => {
			// json schema has no equivalent for zod's "accept then strip" policy (persistedSkillSchema.test.ts).
			if (zodSchema instanceof z.ZodObject && !zodSchema.def.catchall) jsonSchema['x-zod-strip'] = true;
		},
	});
	return { ...json, [schemaVersionKey]: schemaVersion };
}

export function fromSkillJsonSchema(json: z.core.JSONSchema.JSONSchema): z.ZodType {
	//
	// a private registry avoids leaking ids/metadata between independently stored schemas.
	const registry = z.registry<Record<string, unknown>>();
	const native = z.fromJSONSchema(explicitConjunctions(json), { registry });
	const visited = new Map<z.ZodType, z.ZodType>();

	function hydrate(node: z.core.$ZodType): z.ZodType {
		//
		if (!(node instanceof z.ZodType)) throw new Error('Expected a native Zod schema');
		const cached = visited.get(node);
		if (cached) return cached;
		const metadata = registry.get(node) ?? {};
		let result: z.ZodType = node;
		if (node instanceof z.ZodObject) {
			result = node.clone({
				...node.def,
				shape: Object.fromEntries(Object.entries(node.shape).map(([key, child]) => [key, hydrate(child)])),
				catchall: node.def.catchall ? hydrate(node.def.catchall) : undefined,
			});
		} else if (node instanceof z.ZodArray) {
			result = node.clone({ ...node.def, element: hydrate(node.element) });
		} else if (node instanceof z.ZodRecord) {
			result = node.clone({ ...node.def, valueType: hydrate(node.valueType) });
		} else if (node instanceof z.ZodUnion) {
			result = node.clone({ ...node.def, options: node.options.map(hydrate) });
		} else if (node instanceof z.ZodIntersection) {
			result = node.clone({ ...node.def, left: hydrate(node.def.left), right: hydrate(node.def.right) });
		} else if (node instanceof z.ZodTuple) {
			result = node.clone({
				...node.def,
				items: node.def.items.map(hydrate),
				rest: node.def.rest ? hydrate(node.def.rest) : null,
			});
		} else if (node instanceof z.ZodOptional) {
			result = hydrate(node.unwrap()).optional();
		} else if (node instanceof z.ZodNullable) {
			result = hydrate(node.unwrap()).nullable();
		} else if (node instanceof z.ZodDefault) {
			result = hydrate(node.unwrap());
		} else if (node instanceof z.ZodPipe) {
			result = node.clone({ ...node.def, in: hydrate(node.in), out: hydrate(node.out) });
		} else if (node instanceof z.ZodLazy) {
			result = z.lazy(() => hydrate(node.unwrap()));
		} else if (node instanceof z.ZodReadonly) {
			result = hydrate(node.unwrap()).readonly();
		}

		if (metadata['x-zod-strip'] === true && result instanceof z.ZodObject) result = result.strip();
		if (typeof metadata['x-zod-tuple-length'] === 'number') {
			const length = metadata['x-zod-tuple-length'];
			result = z
				.unknown()
				.refine((value) => !Array.isArray(value) || value.length >= length, 'Tuple is too short')
				.pipe(result);
		}
		if (metadata['x-codec'] !== undefined) {
			if (metadata['x-codec'] !== bigintCodec) throw new Error(`Unknown codec: ${metadata['x-codec']}`);
			const options = bigintOptionsSchema.parse(metadata['x-bigint'] ?? {});
			let domain = z.bigint();
			if (options.minimum !== undefined) domain = domain.min(BigInt(options.minimum));
			if (options.maximum !== undefined) domain = domain.max(BigInt(options.maximum));
			if (options.exclusiveMinimum !== undefined) domain = domain.gt(BigInt(options.exclusiveMinimum));
			if (options.exclusiveMaximum !== undefined) domain = domain.lt(BigInt(options.exclusiveMaximum));
			for (const divisor of options.multipleOf ?? []) domain = domain.multipleOf(BigInt(divisor));
			const wire = result.pipe(decimal);
			const codec = z.codec(wire, domain, {
				decode: BigInt,
				encode: String,
			});
			// queued actions already contain bigint values; json callers supply decimal strings.
			result = z.union([domain.refine((value) => wire.safeParse(String(value)).success), codec]);
		}
		if (node instanceof z.ZodDefault) {
			// zod 3 parsed defaults; zod 4 returns output directly (persistedSkillSchema.test.ts).
			if (metadata['x-zod-prefault'] === true) result = result.prefault(node.def.defaultValue);
			else result = result.default(decodeDefault(node, node.def.defaultValue));
		}
		if (metadata['x-zod-optional'] === true) result = z.union([z.undefined(), result]);
		if (metadata['x-zod-readonly'] === true) result = result.readonly();
		visited.set(node, result);
		return result;
	}

	function decodeDefault(node: z.core.$ZodType, value: unknown): unknown {
		// defaults are output values, so restore their types without stripping keys or revalidating them.
		if (registry.get(node)?.['x-codec'] === bigintCodec && typeof value === 'string')
			return BigInt(decimal.parse(value));
		if (
			node instanceof z.ZodDefault ||
			node instanceof z.ZodOptional ||
			node instanceof z.ZodNullable ||
			node instanceof z.ZodReadonly
		)
			return decodeDefault(node.unwrap(), value);
		if (node instanceof z.ZodObject && typeof value === 'object' && value !== null && !Array.isArray(value)) {
			return Object.fromEntries(
				Object.entries(value).map(([key, child]) => [
					key,
					node.shape[key] ? decodeDefault(node.shape[key], child) : child,
				]),
			);
		}
		if (node instanceof z.ZodArray && Array.isArray(value))
			return value.map((child) => decodeDefault(node.element, child));
		if (node instanceof z.ZodRecord && typeof value === 'object' && value !== null && !Array.isArray(value))
			return Object.fromEntries(
				Object.entries(value).map(([key, child]) => [key, decodeDefault(node.valueType, child)]),
			);
		if (node instanceof z.ZodTuple && Array.isArray(value))
			return value.map((child, i) => {
				const schema = node.def.items[i] ?? node.def.rest;
				return schema ? decodeDefault(schema, child) : child;
			});
		if (node instanceof z.ZodUnion) {
			for (const option of node.options) {
				if (z.core.safeParse(option, value).success) return decodeDefault(option, value);
			}
		}
		return value;
	}

	return hydrate(native);
}

// the native importer replaces base constraints for allOf; keep operands explicit (inputSchema.test.ts).
export function explicitConjunctions(schema: z.core.JSONSchema.JSONSchema): z.core.JSONSchema.JSONSchema {
	//
	function visit(input: z.core.JSONSchema._JSONSchema): z.core.JSONSchema._JSONSchema {
		if (typeof input === 'boolean') return input;
		return explicitConjunctions(input);
	}
	const node = { ...schema };
	// native array bounds need items, including unconstrained items (inputSchema.test.ts).
	if (node.type === 'array' && node.items === undefined && node.prefixItems === undefined) node.items = {};
	if (node.definitions !== undefined) {
		const definitions = z.record(z.string(), z.record(z.string(), z.unknown())).parse(node.definitions);
		node.definitions = Object.fromEntries(
			Object.entries(definitions).map(([key, child]) => [key, explicitConjunctions(child)]),
		);
	}
	for (const key of ['properties', 'patternProperties', '$defs'] as const) {
		const children = node[key];
		if (children)
			node[key] = Object.fromEntries(
				Object.entries(children).map(([name, child]) => {
					if (typeof child === 'boolean') return [name, child ? {} : { not: {} }];
					return [name, explicitConjunctions(child)];
				}),
			);
	}
	for (const key of ['additionalProperties', 'additionalItems', 'propertyNames', 'contains', 'not'] as const) {
		const child = node[key];
		if (child !== undefined) node[key] = visit(child);
	}
	if (node.prefixItems) node.prefixItems = node.prefixItems.map(visit);
	if (node.items !== undefined) node.items = Array.isArray(node.items) ? node.items.map(visit) : visit(node.items);
	for (const key of ['anyOf', 'oneOf'] as const) if (node[key]) node[key] = node[key].map(explicitConjunctions);
	if (!node.allOf) return node;

	const operands = node.allOf.map((child) => {
		if (child.type === undefined && node.type !== undefined)
			return explicitConjunctions({ ...child, type: node.type });
		return explicitConjunctions(child);
	});
	const annotations: z.core.JSONSchema.JSONSchema = {};
	const base: z.core.JSONSchema.JSONSchema = {};
	for (const [key, value] of Object.entries(node)) {
		if (key === 'allOf') continue;
		if (
			(key.startsWith('$') && key !== '$ref') ||
			key.startsWith('x-') ||
			['title', 'description', 'default', 'examples'].includes(key)
		)
			annotations[key] = value;
		else base[key] = value;
	}
	if (Object.keys(base).length) operands.unshift(base);
	return { ...annotations, allOf: operands };
}
