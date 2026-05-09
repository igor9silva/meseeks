import { describe, expect, test } from 'bun:test';
import { canSpendPolicy } from './energyPolicy';

describe('energy policy', () => {
	//
	test('supports negative available energy', () => {
		//
		expect(
			canSpendPolicy({
				total: 50n,
				available: -5n,
				amount: 0n,
				bufferPercent: 10n,
			}),
		).toBe(true);
	});

	test('allows work inside the task buffer', () => {
		//
		expect(
			canSpendPolicy({
				total: 50n,
				available: 10n,
				amount: 15n,
				bufferPercent: 10n,
			}),
		).toBe(true);
	});

	test('rejects obvious over-budget work', () => {
		//
		expect(
			canSpendPolicy({
				total: 50n,
				available: 50n,
				amount: 500n,
				bufferPercent: 10n,
			}),
		).toBe(false);
	});
});
