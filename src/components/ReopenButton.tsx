import type { ReactNode } from 'react';
import type { ButtonProps } from '~/components/ui/button';
import { LoadingButton } from '~/components/ui/loading-button';
import { useSplatParams } from '~/hooks/useSplatParams';
import { useReopen } from '~/hooks/useTaskMutations';
import { RotateCcw } from 'lucide-react';

export function ReopenButton(props: { variant?: ButtonProps['variant']; text?: string; content?: ReactNode }) {
	//
	const { variant, text, content } = props;
	const { taskId } = useSplatParams();
	const { reopen, isReopening } = useReopen();

	if (!taskId) throw new Error('Must be used within a task');

	const handleReopen = () => {
		//
		if (isReopening) return;
		reopen({ taskId });
	};

	return (
		<LoadingButton
			size="sm"
			variant={variant ?? 'outline'}
			onClick={handleReopen}
			loading={isReopening}
			loadingText="Reopening..."
			icon={<RotateCcw className="mr-2 h-4 w-4" />}
			className="flex items-center"
		>
			{content ?? text ?? 'Reopen'}
		</LoadingButton>
	);
}
