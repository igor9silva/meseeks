import { useCallback, useEffect, useState } from 'react';
import type { ChangeEvent, FocusEvent } from 'react';
import { EnergyTooltip } from '~/components/EnergyTooltip';
import { Slider } from '~/components/ui/slider';
import {
	BUDGET_STEPS,
	formatBudget,
	getClosestBudgetStepIndex,
	hasTrailingBudgetDecimalSeparator,
	parseBudgetInput,
} from '~/lib/energyBudget';
import { cn } from '~/lib/utils';

type BudgetSelectorProps = {
	//
	value: number;
	onChange: (value: number) => void;
	label: string;
	className?: string;
	inputTabIndex?: number;
};

export function BudgetSelector({ value, onChange, label, className, inputTabIndex }: BudgetSelectorProps) {
	//
	const [inputValue, setInputValue] = useState(() => formatBudget(value));

	useEffect(() => {
		setInputValue(formatBudget(value));
	}, [value]);

	const handleSliderChange = useCallback(
		(values: number[]) => {
			//
			const nextStepIndex = values[0];
			if (nextStepIndex === undefined) return;

			const nextBudget = BUDGET_STEPS[nextStepIndex];
			if (nextBudget === undefined) return;

			setInputValue(formatBudget(nextBudget));
			onChange(nextBudget);
		},
		[onChange],
	);

	const handleInputChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			//
			const nextInputValue = event.target.value;
			setInputValue(nextInputValue);
			if (hasTrailingBudgetDecimalSeparator(nextInputValue)) return;

			const parsedValue = parseBudgetInput(nextInputValue);
			if (parsedValue === undefined) return;

			onChange(parsedValue);
		},
		[onChange],
	);

	const handleInputBlur = useCallback(
		(_event: FocusEvent<HTMLInputElement>) => {
			//
			const parsedValue = parseBudgetInput(inputValue);
			if (parsedValue === undefined) {
				setInputValue(formatBudget(value));
				return;
			}

			if (parsedValue !== value) onChange(parsedValue);
			setInputValue(formatBudget(parsedValue));
		},
		[inputValue, onChange, value],
	);

	return (
		<div className={cn('flex items-center gap-2', className)}>
			<EnergyTooltip className="inline-flex flex-col items-start gap-0.5 cursor-auto shrink-0" tabIndex={-1}>
				<p className="text-sm text-muted-foreground">{label}</p>
				<div className="text-primary flex items-center gap-1 text-sm font-medium">
					<span aria-hidden="true">⚡</span>
					<input
						type="text"
						inputMode="decimal"
						tabIndex={inputTabIndex}
						value={inputValue}
						onChange={handleInputChange}
						onBlur={handleInputBlur}
						autoComplete="off"
						className="h-auto w-14 border-none bg-transparent p-0 text-left shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
					/>
				</div>
			</EnergyTooltip>
			<Slider
				min={0}
				max={BUDGET_STEPS.length - 1}
				step={1}
				// the slider stays on curated presets while the input still accepts exact numbers.
				value={[getClosestBudgetStepIndex(value)]}
				onValueChange={handleSliderChange}
				className="flex-1 py-2"
			/>
		</div>
	);
}
