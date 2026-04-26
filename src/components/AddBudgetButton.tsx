import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { asBigInt } from 'lib/money';
import { Button, type ButtonProps } from '~/components/ui/button';
import { LoadingButton } from '~/components/ui/loading-button';
import { useSplatParams } from '~/hooks/useSplatParams';
import { useIncreaseBudget } from '~/hooks/useTaskMutations';

export function AddCustomBudgetButton(props: { variant?: ButtonProps['variant']; text?: string; content?: ReactNode }) {
	//
	return (
		<Link to="." search={(prev) => ({ ...prev, isEnergyDrawerOpen: true })} className="no-underline">
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

export function AddBudgetButton(props: {
	variant?: ButtonProps['variant'];
	amount?: number;
	shouldIterate?: boolean;
	text?: string;
}) {
	//
	const { amount, shouldIterate, variant, text } = props;
	const { taskId } = useSplatParams();
	const { increaseBudget, isIncreasingBudget } = useIncreaseBudget();

	if (!taskId) throw new Error('Must be used within a task');
	if (amount === undefined) return <AddCustomBudgetButton variant={variant} text={text} />;

	const handleAddBudget = () => {
		//
		if (isIncreasingBudget) return;
		increaseBudget({
			taskId,
			amount: asBigInt({ dollars: amount }),
			shouldIterate: shouldIterate ?? true,
		});
	};

	return (
		<LoadingButton
			size="sm"
			variant={variant ?? 'default'}
			onClick={handleAddBudget}
			loading={isIncreasingBudget}
			loadingText="Adding..."
			icon={<span className="mr-2">⚡</span>}
			className="flex items-center"
		>
			{text ?? `Add ${amount.toFixed(2)}`}
		</LoadingButton>
	);
}
