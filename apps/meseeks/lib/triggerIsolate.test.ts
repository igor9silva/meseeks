import { describe, expect, test } from 'bun:test';
import { managedTriggerHandlers } from './proDefinitions';
import { evaluateTriggerCode } from './triggerIsolate';

describe('trigger isolate', () => {
	test('runs managed Ask and Seek handler registrations', async () => {
		const ask = await evaluateTriggerCode({
			code: managedHandlerCode('@pro/triggers/Ask'),
			context: {
				action: {
					skillKey: 'say',
				},
			},
			timeoutMs: 1000,
		});
		expect(ask.proposals).toEqual([
			{
				skillKey: 'think',
				args: {
					mode: 'reply',
				},
			},
		]);

		const ignoredAsk = await evaluateTriggerCode({
			code: managedHandlerCode('@pro/triggers/Ask'),
			context: {
				action: {
					skillKey: 'plan',
				},
			},
			timeoutMs: 1000,
		});
		expect(ignoredAsk.proposals).toEqual([]);

		const seekPlan = await evaluateTriggerCode({
			code: managedHandlerCode('@pro/triggers/Seek'),
			context: {
				action: {
					skillKey: 'say',
				},
			},
			timeoutMs: 1000,
		});
		expect(seekPlan.proposals).toEqual([
			{
				skillKey: 'plan',
				args: {},
			},
		]);

		const seekIterate = await evaluateTriggerCode({
			code: managedHandlerCode('@pro/triggers/Seek'),
			context: {
				action: {
					skillKey: 'plan',
				},
			},
			timeoutMs: 1000,
		});
		expect(seekIterate.proposals).toEqual([
			{
				skillKey: 'iterate',
				args: {
					maxDepth: 8,
					iteration: 1,
				},
			},
		]);

		const seekContinue = await evaluateTriggerCode({
			code: managedHandlerCode('@pro/triggers/Seek'),
			context: {
				action: {
					skillKey: 'iterate',
					args: {
						iteration: 2,
					},
					depth: 2,
					result: {
						metadata: {
							seekState: 'continue',
						},
					},
				},
			},
			timeoutMs: 1000,
		});
		expect(seekContinue.proposals).toEqual([
			{
				skillKey: 'iterate',
				args: {
					maxDepth: 8,
					iteration: 3,
				},
			},
		]);
	});

	test('rejects malformed proposals', async () => {
		await expect(
			evaluateTriggerCode({
				code: '() => ({ proposals: [{ args: {} }] })',
				context: {},
				timeoutMs: 1000,
			}),
		).rejects.toThrow();
	});

	test('does not expose network, process, require, or ambient secrets', async () => {
		const result = await evaluateTriggerCode({
			code: `() => ({
				proposals: [{
					skillKey: "think",
					args: {
						hasFetch: typeof fetch !== "undefined",
						hasProcess: typeof process !== "undefined",
						hasRequire: typeof require !== "undefined",
						hasSecret: typeof DAYTONA_API_KEY !== "undefined" || typeof OPENAI_API_KEY !== "undefined",
					},
				}],
			})`,
			context: {},
			timeoutMs: 1000,
		});

		expect(result.proposals[0]?.args).toEqual({
			hasFetch: false,
			hasProcess: false,
			hasRequire: false,
			hasSecret: false,
		});
	});
});

function managedHandlerCode(ref: string) {
	//
	const handler = managedTriggerHandlers.find((candidate) => candidate.key === ref);
	if (!handler) throw new Error(`Missing managed trigger handler ${ref}`);

	return handler.body;
}
