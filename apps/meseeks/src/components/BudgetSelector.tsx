import { useState } from 'react';
import type { ChangeEvent, FocusEvent } from 'react';
import { EnergyTooltip } from '~/components/EnergyTooltip';
import { Slider } from '@reactor/ui/slider';
import {
	BUDGET_STEPS,
	formatBudget,
	getClosestBudgetStepIndex,
	hasTrailingBudgetDecimalSeparator,
	parseBudgetInput,
} from '~/lib/energyBudget';
import { cn } from '@reactor/ui/lib/utils';

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
	const [inputState, setInputState] = useState(() => ({
		value,
		inputValue: formatBudget(value),
	}));
	const inputValue = inputState.value === value ? inputState.inputValue : formatBudget(value);

	const handleSliderChange = (values: number[]) => {
		//
		const nextStepIndex = values[0];
		if (nextStepIndex === undefined) return;

		const nextBudget = BUDGET_STEPS[nextStepIndex];
		if (nextBudget === undefined) return;

		setInputState({ value: nextBudget, inputValue: formatBudget(nextBudget) });
		onChange(nextBudget);
	};

	const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
		//
		const nextInputValue = event.target.value;
		setInputState({ value, inputValue: nextInputValue });
		if (hasTrailingBudgetDecimalSeparator(nextInputValue)) return;

		const parsedValue = parseBudgetInput(nextInputValue);
		if (parsedValue === undefined) return;

		onChange(parsedValue);
	};

	const handleInputBlur = (_event: FocusEvent<HTMLInputElement>) => {
		//
		const parsedValue = parseBudgetInput(inputValue);
		if (parsedValue === undefined) {
			setInputState({ value, inputValue: formatBudget(value) });
			return;
		}

		if (parsedValue !== value) onChange(parsedValue);
		setInputState({ value: parsedValue, inputValue: formatBudget(parsedValue) });
	};

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
