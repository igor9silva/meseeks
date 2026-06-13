import { describe, expect, test } from 'bun:test';
import { getTrustedIntelligence, trustedIntelligenceKeys, trustedIntelligences } from './intelligences';

describe('trusted PRO intelligence registry', () => {
	test('contains the MVP model set exactly once', () => {
		expect(trustedIntelligenceKeys).toEqual([
			'deepseek/deepseek-v4-flash',
			'deepseek/deepseek-v4-pro',
			'moonshot/kimi-k2.5',
			'moonshot/kimi-k2.6',
			'openai/gpt-5.5',
			'openai/gpt-5.5-pro',
			'openai/gpt-5.4-mini',
		]);
		expect(new Set(trustedIntelligenceKeys).size).toBe(trustedIntelligenceKeys.length);
	});

	test('only includes trusted providers', () => {
		expect(new Set(trustedIntelligences.map((intelligence) => intelligence.provider))).toEqual(
			new Set(['deepseek', 'moonshot', 'openai']),
		);
	});

	test('does not route Kimi or DeepSeek through OpenAI', () => {
		expect(getTrustedIntelligence('moonshot/kimi-k2.5')?.provider).toBe('moonshot');
		expect(getTrustedIntelligence('moonshot/kimi-k2.6')?.provider).toBe('moonshot');
		expect(getTrustedIntelligence('deepseek/deepseek-v4-flash')?.provider).toBe('deepseek');
		expect(getTrustedIntelligence('deepseek/deepseek-v4-pro')?.provider).toBe('deepseek');
	});
});
