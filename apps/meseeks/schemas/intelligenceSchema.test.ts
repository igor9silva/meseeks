import { describe, expect, test } from 'bun:test';
import { referenceConcreteIntelligence, referenceIntelligenceSelection } from './intelligenceSchema';

describe('intelligence references', () => {
	test('keeps Genius as the action intelligence key while resolving to its concrete provider model', () => {
		const genius = referenceIntelligenceSelection({
			key: 'Genius',
		});

		expect(genius.key).toBe('Genius');
		expect(genius.intelligence).toBe('openai/gpt-5.5');
		expect(genius.provider).toEqual({
			provider: 'openai',
			intelligence: 'gpt-5.5',
		});
	});

	test('exposes GPT 5.5 Pro as a concrete OpenAI intelligence', () => {
		const intelligence = referenceConcreteIntelligence({
			key: 'openai/gpt-5.5-pro',
		});

		expect(intelligence.name).toBe('GPT 5.5 Pro');
		expect(intelligence.provider).toEqual({
			provider: 'openai',
			intelligence: 'gpt-5.5-pro',
		});
	});
});
