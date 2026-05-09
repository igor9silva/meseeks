import type { Doc } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { asDollars } from 'lib/money';
import { addActionReservationTransaction, addActionSettlementTransaction } from './transactions.private';

export async function reserveEnergy(
	ctx: MutationCtx,
	{
		action,
		amount,
	}: {
		action: Doc<'actions'>;
		amount: bigint;
	},
) {
	//
	if ('reservedAt' in action) {
		throw new Error(`Action ${action._id} has already reserved energy.`);
	}

	if (amount > 0n) {
		await addActionReservationTransaction(ctx, {
			taskId: action.taskId,
			actionId: action._id,
			owner: action.owner,
			value: {
				symbol: 'USD',
				amount: -amount,
			},
			description: `Reserved ${asDollars({ bigInt: amount, precision: 6 })} for ${action.skillKey}.`,
		});
	}

	const reservedAt = Date.now();

	return {
		reservedEnergy: amount,
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
		costs: Array<{
			amount: bigint;
		}>;
	},
) {
	//
	if ('settledAt' in action) return {};
	if (!('reservedEnergy' in action)) return {};

	const reservedEnergy = action.reservedEnergy;
	const actualCost = costs.reduce((acc, cost) => acc + cost.amount, 0n);
	const settlementDelta = reservedEnergy - actualCost;

	if (settlementDelta < 0n) {
		console.warn(
			`Action ${action._id} cost more than maxCost.`,
			`Reserved ${asDollars({ bigInt: reservedEnergy, precision: 6 })}.`,
			`Actual ${asDollars({ bigInt: actualCost, precision: 6 })}.`,
		);
	}

	if (settlementDelta !== 0n) {
		await addActionSettlementTransaction(ctx, {
			taskId: action.taskId,
			actionId: action._id,
			owner: action.owner,
			value: {
				symbol: 'USD',
				amount: settlementDelta,
			},
			description: `Settled ${action.skillKey}.`,
		});
	}

	const settledAt = Date.now();

	return {
		settledAt,
	};
}
