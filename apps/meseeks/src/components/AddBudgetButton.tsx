import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { Button, type ButtonProps } from '@pro/ui/button';
import { useComposer } from '~/hooks/useComposer';

export function AddCustomBudgetButton(props: { variant?: ButtonProps['variant']; text?: string; content?: ReactNode }) {
	//
	return (
		<Link
			to="."
			search={(prev: Record<string, unknown>) => ({ ...prev, isEnergyDrawerOpen: true })}
			className="no-underline"
		>
			<Button size="sm" variant={props.variant ?? 'default'} className="flex items-center gap-1">
				{props.content ?? (
					<>
						<span>⚡</span>
						{props.text ?? 'Add energy'}
					</>
				)}
			</Button>
		</Link>
	);
}

export function AddBudgetButton(props: { variant?: ButtonProps['variant']; amount?: number; text?: string }) {
	//
	const { amount, variant, text } = props;
	const { addEnergyIncrease } = useComposer();

	if (amount === undefined) return <AddCustomBudgetButton variant={variant} text={text} />;

	const handleAddBudget = () => {
		//
		addEnergyIncrease(amount);
	};

	return (
		<Button size="sm" variant={variant ?? 'outline'} onClick={handleAddBudget} className="flex items-center">
			<span>⚡</span>
			{text ?? `Add ${amount.toFixed(2)}`}
		</Button>
	);
}
