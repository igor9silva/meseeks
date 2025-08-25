import { Link } from '@tanstack/react-router';
import { asBigInt } from 'convex/lib/money';
import { Button } from '~/components/ui/button';
import { LoadingButton } from '~/components/ui/loading-button';
import { useSplatParams } from '~/hooks/useSplatParams';
import { useIncreaseBudget } from '~/hooks/useTaskMutations';

export function AddCustomBudgetButton(props: { variant?: 'ghost' | 'default'; text?: string }) {
	//
	return (
		<Link to="." search={(prev) => ({ ...prev, isBudgetDrawerOpen: true })} className="no-underline">
			<Button size="sm" variant={props.variant ?? 'default'} className="flex items-center gap-1">
				<span>⚡</span>
				{props.text ?? 'Add energy'}
			</Button>
		</Link>
	);
}

export function AddBudgetButton(props: {
	variant?: 'ghost' | 'default';
	amount?: number;
	shouldIterate?: boolean;
	text?: string;
}) {
	//
	const { amount, shouldIterate, variant, text } = props;
	const { taskId } = useSplatParams();
	const { increaseBudget, isPending } = useIncreaseBudget();

	if (!taskId) throw new Error('Must be used within a task');
	if (amount === undefined) return <AddCustomBudgetButton />;

	const handleAddBudget = () => {
		if (isPending) return;
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
			loading={isPending}
			loadingText="Adding..."
			icon={<span className="mr-2">⚡</span>}
			className="flex items-center"
		>
			{text ?? `Add ${amount.toFixed(2)}`}
		</LoadingButton>
	);
}
