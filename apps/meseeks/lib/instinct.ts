import { z } from 'zod/v3';
import type { Doc, Id } from 'convex/_generated/dataModel';
import type { PerformResult, StagedText } from 'schemas/reactorSchema';
import { instinctSchema } from 'schemas/skillSchema';

type BaseContext = {
	action: Doc<'actions'>;
	preparation?: Record<string, unknown>;
	warnings: Array<string>;
};

type InstinctContext<Input = Record<string, unknown>> = BaseContext & {
	input: Input;
};

type InstinctReactor = {
	stageText(args: { owner: Id<'users'>; content: string; contentType: string }): Promise<StagedText>;
};

type InstinctDefinition<InputSchema extends z.ZodType = z.ZodType, OutputSchema extends z.ZodType = z.ZodType> = {
	key: z.infer<typeof instinctSchema>['kind'];
	description: string;
	inputSchema: InputSchema;
	outputSchema: OutputSchema;
	perform(
		context: InstinctContext<z.infer<InputSchema>>,
		reactor: InstinctReactor,
	): Promise<PerformResult> | PerformResult;
};

type RuntimeInstinctDefinition<InputSchema extends z.ZodType, OutputSchema extends z.ZodType> = Omit<
	InstinctDefinition<InputSchema, OutputSchema>,
	'perform'
> & {
	perform(
		context: InstinctContext<Record<string, unknown>>,
		reactor: InstinctReactor,
	): Promise<PerformResult> | PerformResult;
};

export function defineInstinct<InputSchema extends z.ZodType, OutputSchema extends z.ZodType>(
	definition: InstinctDefinition<InputSchema, OutputSchema>,
): RuntimeInstinctDefinition<InputSchema, OutputSchema> {
	//
	return {
		key: definition.key,
		description: definition.description,
		inputSchema: definition.inputSchema,
		outputSchema: definition.outputSchema,
		perform(context, reactor) {
			//
			return definition.perform(
				{
					...context,
					input: definition.inputSchema.parse(context.input),
				},
				reactor,
			);
		},
	};
}
