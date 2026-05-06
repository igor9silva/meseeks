import { z } from 'zod/v3';
import type { Doc } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { InsufficientAccountFunds, NotFound } from 'lib/errors';
import { asDollars } from 'lib/money';
import { tokenSchema } from 'schemas/topUpSchema';

export type EnergyBudget = {
	total: bigint;
	available: bigint;
};

export type EnergyPressure = 'none' | 'low' | 'medium' | 'high' | 'overrun';

type ActionCost = {
	symbol: z.infer<typeof tokenSchema>;
	amount: bigint;
	description: string;
};

export function energyStateFor(budget: EnergyBudget) {
	//
	const spent = budget.total - budget.available;
	const pressure = energyPressureFor(budget);

	return {
		total: budget.total,
		available: budget.available,
		spent,
		pressure,
	};
}

function energyPressureFor(budget: EnergyBudget) {
	//
	const spent = budget.total - budget.available;

	if (budget.available < 0n) return 'overrun';
	if (budget.total <= 0n) return spent > 0n ? 'overrun' : 'none';

	const percentSpent = Number((spent * 100n) / budget.total);

	if (percentSpent >= 90) return 'high';
	if (percentSpent >= 60) return 'medium';
	if (percentSpent > 0) return 'low';

	return 'none';
}

export function canSpendEnergy({
	budget,
	amount,
	bufferPercent,
}: {
	budget: EnergyBudget;
	amount: bigint;
	bufferPercent: number;
}) {
	//
	if (amount < 0n) throw new Error('Energy spend amount cannot be negative.');

	const spent = budget.total - budget.available;
	const bufferedTotal = applyPercentBuffer(budget.total, bufferPercent);

	return spent + amount <= bufferedTotal;
}

export function spendEnergy(budget: EnergyBudget, amount: bigint): EnergyBudget {
	//
	if (amount < 0n) throw new Error('Energy spend amount cannot be negative.');

	return {
		total: budget.total,
		available: budget.available - amount,
	};
}

export function computeSettlement({ reservedEnergy, actualCost }: { reservedEnergy: bigint; actualCost: bigint }) {
	//
	return reservedEnergy - actualCost;
}

export async function reserveEnergy(
	ctx: MutationCtx,
	{
		action,
		task,
		maxCost,
	}: {
		action: Doc<'actions'>;
		task: Doc<'tasks'>;
		maxCost: bigint;
	},
) {
	//
	const user = await ctx.db.get(task.owner);
	if (!user) throw NotFound();

	const balance = user.balanceUSD ?? 0n;
	if (balance < maxCost) throw InsufficientAccountFunds();

	const reservedAt = Date.now();

	if (maxCost > 0n) {
		await ctx.db.insert('transactions', {
			kind: 'reserve action',
			actionId: action._id,
			taskId: task._id,
			owner: task.owner,
			value: {
				symbol: 'USD',
				amount: -maxCost,
			},
			description: `Reserved ${asDollars({ bigInt: maxCost, precision: 6 })} energy for ${action.skillKey}.`,
		});

		await ctx.db.patch(task.owner, {
			balanceUSD: balance - maxCost,
		});
	}

	await ctx.db.patch(action._id, {
		reservedEnergy: maxCost,
		reservedAt,
	});

	return {
		...action,
		reservedEnergy: maxCost,
		reservedAt,
	};
}

export async function settleAction(
	ctx: MutationCtx,
	{
		action,
		costs,
	}: {
		action: Doc<'actions'>;
		costs: ActionCost[];
	},
) {
	//
	if (action.settledAt) return totalCostFrom(costs);

	const actualCost = totalCostFrom(costs);
	const reservedEnergy = action.reservedEnergy ?? 0n;
	const settlementDelta = computeSettlement({ reservedEnergy, actualCost });

	if (settlementDelta < 0n) {
		console.warn(
			`Action ${action._id} cost exceeded reserved energy.`,
			'reserved',
			asDollars({ bigInt: reservedEnergy, precision: 6 }),
			'actual',
			asDollars({ bigInt: actualCost, precision: 6 }),
			'extra',
			asDollars({ bigInt: -settlementDelta, precision: 6 }),
		);
	}

	if (settlementDelta !== 0n) {
		const user = await ctx.db.get(action.owner);
		if (!user) throw NotFound();

		await ctx.db.insert('transactions', {
			kind: 'settle action',
			actionId: action._id,
			taskId: action.taskId,
			owner: action.owner,
			value: {
				symbol: 'USD',
				amount: settlementDelta,
			},
			description:
				settlementDelta > 0n
					? `Released ${asDollars({ bigInt: settlementDelta, precision: 6 })} unused action energy.`
					: `Charged ${asDollars({ bigInt: -settlementDelta, precision: 6 })} action energy over reserve.`,
		});

		await ctx.db.patch(action.owner, {
			balanceUSD: (user.balanceUSD ?? 0n) + settlementDelta,
		});
	}

	await ctx.db.patch(action._id, {
		settledAt: Date.now(),
	});

	return actualCost;
}

function totalCostFrom(costs: ActionCost[]) {
	//
	return costs.reduce((acc, cost) => acc + cost.amount, 0n);
}

function applyPercentBuffer(amount: bigint, percent: number) {
	//
	if (percent <= 0) return amount;

	return amount + (amount * BigInt(Math.round(percent))) / 100n;
}
