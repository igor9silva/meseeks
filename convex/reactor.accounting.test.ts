import { expect, test } from 'bun:test';
import { asBigInt } from 'lib/money';
import { canSpendEnergy, energyStateFor, computeSettlement, spendEnergy } from './reactor.accounting';

test('energy budget supports negative available as overrun pressure', () => {
	//
	const budget = {
		total: asBigInt({ dollars: 0.5 }),
		available: -asBigInt({ dollars: 0.05 }),
	};

	expect(energyStateFor(budget)).toEqual({
		total: asBigInt({ dollars: 0.5 }),
		available: -asBigInt({ dollars: 0.05 }),
		spent: asBigInt({ dollars: 0.55 }),
		pressure: 'overrun',
	});
});

test('task policy allows spending inside the in-memory buffer', () => {
	//
	const budget = {
		total: asBigInt({ dollars: 0.5 }),
		available: asBigInt({ dollars: 0.1 }),
	};

	expect(
		canSpendEnergy({
			budget,
			amount: asBigInt({ dollars: 0.15 }),
			bufferPercent: 10,
		}),
	).toBe(true);
});

test('task policy rejects obvious over-budget work', () => {
	//
	const budget = {
		total: asBigInt({ dollars: 0.5 }),
		available: asBigInt({ dollars: 0.5 }),
	};

	expect(
		canSpendEnergy({
			budget,
			amount: asBigInt({ dollars: 5 }),
			bufferPercent: 10,
		}),
	).toBe(false);
});

test('spending task energy can move available below zero', () => {
	//
	const budget = spendEnergy(
		{
			total: asBigInt({ dollars: 0.5 }),
			available: asBigInt({ dollars: 0.1 }),
		},
		asBigInt({ dollars: 0.15 }),
	);

	expect(budget.available).toBe(-asBigInt({ dollars: 0.05 }));
});

test('settlement delta supports positive refunds and negative extra charges', () => {
	//
	expect(
		computeSettlement({
			reservedEnergy: asBigInt({ dollars: 0.5 }),
			actualCost: asBigInt({ dollars: 0.4 }),
		}),
	).toBe(asBigInt({ dollars: 0.1 }));

	expect(
		computeSettlement({
			reservedEnergy: asBigInt({ dollars: 0.5 }),
			actualCost: asBigInt({ dollars: 0.6 }),
		}),
	).toBe(-asBigInt({ dollars: 0.1 }));
});
