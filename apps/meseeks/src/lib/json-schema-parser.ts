import { z } from 'zod/v3';

export interface SchemaProperty {
	name: string;
	type: string;
	description?: string;
	required: boolean;
	constraints?: string[];
}

const propertySchema = z
	.object({
		type: z.string().optional(),
		description: z.string().optional(),
		minimum: z.unknown().optional(),
		maximum: z.unknown().optional(),
		min: z.unknown().optional(),
		max: z.unknown().optional(),
		minLength: z.unknown().optional(),
		maxLength: z.unknown().optional(),
		pattern: z.unknown().optional(),
		enum: z.array(z.unknown()).optional(),
		default: z.unknown().optional(),
		defaultValue: z.unknown().optional(),
		isOptional: z.boolean().optional(),
	})
	.passthrough();

const schemaSchema = z
	.object({
		type: z.string().optional(),
		properties: z.record(propertySchema).optional(),
		required: z.array(z.string()).optional(),
	})
	.passthrough();

export function parseJsonSchemaToProperties(schema: string): SchemaProperty[] {
	//
	try {
		const parsed = schemaSchema.parse(JSON.parse(schema));
		const properties: SchemaProperty[] = [];

		if (parsed.type === 'object' && parsed.properties) {
			//
			// Get explicitly required fields from schema
			const explicitlyRequired = parsed.required ?? [];

			Object.entries(parsed.properties).forEach(([name, propSchema]) => {
				//
				const constraints: string[] = [];

				// Add type-specific constraints
				if (propSchema.minimum !== undefined) constraints.push(`min: ${propSchema.minimum}`);
				if (propSchema.maximum !== undefined) constraints.push(`max: ${propSchema.maximum}`);
				if (propSchema.min !== undefined) constraints.push(`min: ${propSchema.min}`);
				if (propSchema.max !== undefined) constraints.push(`max: ${propSchema.max}`);
				if (propSchema.minLength !== undefined) constraints.push(`min length: ${propSchema.minLength}`);
				if (propSchema.maxLength !== undefined) constraints.push(`max length: ${propSchema.maxLength}`);
				if (propSchema.pattern) constraints.push(`pattern: ${String(propSchema.pattern)}`);
				if (propSchema.enum) constraints.push(`options: ${propSchema.enum.map(String).join(', ')}`);

				// Handle both standard JSON Schema default and zodex defaultValue
				const defaultValue = propSchema.default !== undefined ? propSchema.default : propSchema.defaultValue;
				if (defaultValue !== undefined) constraints.push(`default: ${JSON.stringify(defaultValue)}`);

				// Determine if property is required:
				// 1. Check zodex isOptional property first
				// 2. If there's an explicit required array, use it
				// 3. If no explicit required array, assume required UNLESS it has a default value or is marked as optional
				let isRequired: boolean;
				if (propSchema.isOptional !== undefined) {
					// zodex format: isOptional: true means NOT required
					isRequired = !propSchema.isOptional;
				} else if (explicitlyRequired.length > 0) {
					// Standard JSON Schema format with required array
					isRequired = explicitlyRequired.includes(name);
				} else {
					// Fallback: assume required unless it has a default value
					isRequired = defaultValue === undefined;
				}

				properties.push({
					name,
					type: getHumanReadableType(propSchema),
					description: propSchema.description,
					required: isRequired,
					constraints: constraints.length > 0 ? constraints : undefined,
				});
			});
		}

		return properties;
	} catch (error) {
		console.error('Failed to parse JSON schema:', error);
		return [];
	}
}

function getHumanReadableType(propSchema: z.infer<typeof propertySchema>): string {
	if (propSchema.type) {
		switch (propSchema.type) {
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
			case 'bigInt':
				return 'number (bigint)';
			default:
				return propSchema.type;
		}
	}

	if (propSchema.enum) {
		return 'Choice';
	}

	return 'Unknown';
}
