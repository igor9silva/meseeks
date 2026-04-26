export const BUDGET_STEPS = [
	0, //
	0.02,
	0.2,
	0.5,
	1,
	2,
	5,
	10,
	20,
	50,
	100,
	200,
	500,
	1000,
] as const;
export type BudgetStep = (typeof BUDGET_STEPS)[number];

export const MIN_BUDGET = BUDGET_STEPS[0];
export const MAX_BUDGET = BUDGET_STEPS[BUDGET_STEPS.length - 1];

const budgetFormatter = new Intl.NumberFormat(undefined, {
	maximumFractionDigits: 2,
	useGrouping: false,
});
const budgetDecimalSeparator = budgetFormatter.formatToParts(1.1).find((part) => part.type === 'decimal')?.value ?? '.';

export function clampBudget(value: number) {
	//
	return Math.min(MAX_BUDGET, Math.max(MIN_BUDGET, value));
}

export function formatBudget(value: number) {
	//
	return budgetFormatter.format(value);
}

export function hasTrailingBudgetDecimalSeparator(value: string) {
	//
	const trimmedValue = value.trimEnd();
	return trimmedValue.endsWith(budgetDecimalSeparator) || trimmedValue.endsWith('.') || trimmedValue.endsWith(',');
}

export function parseBudgetInput(value: string) {
	//
	const trimmedValue = value.trim();
	if (!trimmedValue) return undefined;

	const normalizedValue = trimmedValue.replaceAll(',', '.');
	const parsedValue = Number(normalizedValue);
	if (Number.isNaN(parsedValue)) return undefined;

	return clampBudget(parsedValue);
}

export function getClosestBudgetStepIndex(value: number) {
	//
	let closestIndex = 0;

	for (let index = 0; index < BUDGET_STEPS.length; index += 1) {
		const step = BUDGET_STEPS[index];
		const closestStep = BUDGET_STEPS[closestIndex];
		if (step === undefined || closestStep === undefined) continue;
		if (Math.abs(step - value) < Math.abs(closestStep - value)) closestIndex = index;
	}

	return closestIndex;
}
