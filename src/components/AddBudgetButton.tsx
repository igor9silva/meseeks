import { Link } from '@tanstack/react-router';
import { asBigInt } from 'convex/lib/money';
import { Button } from '~/components/ui/button';
import { useSplatParams } from '~/hooks/useSplatParams';
import { useTaskMutations } from '~/hooks/useTaskMutations';

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
	amount: number;
	shouldIterate?: boolean;
	text?: string;
}) {
	//
	const { taskId } = useSplatParams();
	const { increaseBudget } = useTaskMutations();

	if (!taskId) throw new Error('Must be used within a task');

	const handleAddBudget = () => {
		//
		increaseBudget({
			taskId,
			amount: asBigInt({ dollars: props.amount }),
			shouldIterate: props.shouldIterate ?? true,
		});
	};

	return (
		<Button
			size="sm"
			variant={props.variant ?? 'default'}
			onClick={handleAddBudget}
			className="flex items-center gap-1"
		>
			<span>⚡</span>
			{props.text ?? `Add ${props.amount.toFixed(2)}`}
		</Button>
	);
}
