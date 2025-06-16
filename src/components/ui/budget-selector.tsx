import * as React from 'react';
import { Slider } from '~/components/ui/slider';

export const BUDGET_STEPS = [
	0, //
	0.1,
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

type BudgetSelectorProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'defaultValue'> & {
	//
	value?: BudgetStep;
	defaultValue?: BudgetStep;
	onChange?: (value: BudgetStep) => void;
	className?: string;
};

export const BudgetSelector = React.forwardRef<HTMLInputElement, BudgetSelectorProps>(
	(
		{ value, defaultValue = 0.2, onChange, name, className, ...props }, //
		ref,
	) => {
		//
		const [localValue, setLocalValue] = React.useState<BudgetStep>(defaultValue);
		const currentValue = value ?? localValue;

		const handleChange = React.useCallback(
			(values: number[]) => {
				const newValue = BUDGET_STEPS[values[0]];
				setLocalValue(newValue);
				onChange?.(newValue);
			},
			[onChange],
		);

		return (
			<div className={`flex flex-row gap-2 ${className}`}>
				<div className="flex flex-col flex-shrink-0">
					<p className="text-sm text-muted-foreground">Spend up to</p>
					<p className="text-sm font-medium">USDc {currentValue.toFixed(2)}</p>
				</div>
				<input type="hidden" ref={ref} name={name} value={currentValue} {...props} />
				<Slider
					min={0}
					max={BUDGET_STEPS.length - 1}
					step={1}
					value={[BUDGET_STEPS.indexOf(currentValue)]}
					onValueChange={handleChange}
					className="py-2"
				/>
			</div>
		);
	},
);

BudgetSelector.displayName = 'BudgetSelector';
