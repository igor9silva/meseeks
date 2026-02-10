import { NoOp } from 'convex-helpers/server/customFunctions';
import { zCustomAction, zCustomMutation, zCustomQuery } from 'convex-helpers/server/zod3';
import { z } from 'zod';
import type { MutationCtx, QueryCtx } from './_generated/server';
import {
	action as actionOG,
	internalAction as internalActionOG,
	internalMutation as internalMutationOG,
	internalQuery as internalQueryOG,
	mutation as mutationOG,
	query as queryOG,
} from './_generated/server';

export const query = zCustomQuery(queryOG, NoOp);
export const mutation = zCustomMutation(mutationOG, NoOp);
export const action = zCustomAction(actionOG, NoOp);
export const internalMutation = zCustomMutation(internalMutationOG, NoOp);
export const internalQuery = zCustomQuery(internalQueryOG, NoOp);
export const internalAction = zCustomAction(internalActionOG, NoOp);

type AsyncValue<Value> = Value | Promise<Value>;
type ArgsSchema = z.ZodObject<z.ZodRawShape>;

type DefinedFn<Ctx, Schema extends ArgsSchema, Result> = ((
	ctx: Ctx,
	args: z.input<Schema>,
) => Promise<Result>) & {
	args: Schema;
};

const defineFunction = <Ctx, Schema extends ArgsSchema, Result>(input: {
	args: Schema;
	handler: (ctx: Ctx, args: z.output<Schema>) => AsyncValue<Result>;
}): DefinedFn<Ctx, Schema, Result> => {
	//
	const { args, handler } = input;

	const fn = async (ctx: Ctx, args: z.input<Schema>) => {
		//
		const parsedArgs = input.args.parse(args);
		return await handler(ctx, parsedArgs);
	};

	return Object.assign(fn, { args });
};

export const defineMutation = <Schema extends ArgsSchema, Result>(input: {
	args: Schema;
	handler: (ctx: MutationCtx, args: z.output<Schema>) => AsyncValue<Result>;
}) => {
	//
	return defineFunction(input);
};

export const defineQuery = <Schema extends ArgsSchema, Result>(input: {
	args: Schema;
	handler: (ctx: QueryCtx | MutationCtx, args: z.output<Schema>) => AsyncValue<Result>;
}) => {
	//
	return defineFunction(input);
};
