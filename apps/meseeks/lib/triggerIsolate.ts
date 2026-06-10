import RELEASE_SYNC from '@jitl/quickjs-singlefile-cjs-release-sync';
import { newQuickJSWASMModuleFromVariant, type QuickJSWASMModule } from 'quickjs-emscripten-core';
import { z } from 'zod/v3';
import { createQuickJsTriggerIsolateAdapter } from './reactor/runtimeAdapters';

const proposalSchema = z.object({
	skillKey: z.string().min(1),
	args: z.record(z.unknown()).default({}),
	loop: z.string().min(1).nullable().optional(),
});

const isolateResultSchema = z.object({
	proposals: z.array(proposalSchema).default([]),
	metadata: z.record(z.unknown()).default({}),
});

export type TriggerIsolateContext = Record<string, unknown>;
export type TriggerIsolateEvaluation = z.infer<typeof isolateResultSchema>;

let quickJsModule: Promise<QuickJSWASMModule> | undefined;

export async function evaluateTriggerCode(args: {
	code: string;
	context: TriggerIsolateContext;
	timeoutMs: number;
}): Promise<TriggerIsolateEvaluation> {
	//
	const adapter = createQuickJsTriggerIsolateAdapter({
		evaluate: async (input) =>
			await evaluateQuickJs({
				code: input.code,
				context: input.context,
				timeoutMs: input.timeoutMs,
			}),
	});

	return isolateResultSchema.parse(await adapter.evaluate(args));
}

async function evaluateQuickJs(args: { code: string; context: TriggerIsolateContext; timeoutMs: number }) {
	//
	const QuickJS = await loadQuickJs();
	const vm = QuickJS.newContext();
	const contextJson = JSON.stringify(args.context, jsonReplacer);
	const code = [
		`const context = ${contextJson};`,
		`const handler = (${args.code});`,
		`if (typeof handler !== "function") throw new Error("Trigger handler must be a function.");`,
		`const result = handler(context);`,
		`result;`,
	].join('\n');

	const timeout = setTimeout(() => {
		vm.runtime.dispose();
	}, args.timeoutMs);

	try {
		const result = vm.evalCode(code);
		if (result.error) {
			const error = vm.dump(result.error);
			result.error.dispose();
			throw new Error(typeof error === 'string' ? error : 'Trigger isolate failed.');
		}

		const value = vm.dump(result.value);
		result.value.dispose();
		return value;
	} finally {
		clearTimeout(timeout);
		vm.dispose();
	}
}

function loadQuickJs() {
	//
	quickJsModule ??= newQuickJSWASMModuleFromVariant(RELEASE_SYNC);
	return quickJsModule;
}

function jsonReplacer(_key: string, value: unknown) {
	//
	if (typeof value === 'bigint') return value.toString();
	return value;
}
