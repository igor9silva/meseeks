import type { ReactNode } from 'react';
import type { ButtonProps } from '@pro/ui/button';
import { LoadingButton } from '@pro/ui/loading-button';
import { useCurrentFileId } from '~/hooks/useCurrentFile';
import { useReopen } from '~/hooks/useFileMutations';
import { RotateCcw } from 'lucide-react';

export function ReopenButton(props: { variant?: ButtonProps['variant']; text?: string; content?: ReactNode }) {
	//
	const { variant, text, content } = props;
	const fileId = useCurrentFileId();
	const { reopen, isReopening } = useReopen();

	if (!fileId) throw new Error('Must be used within a file');

	const handleReopen = () => {
		//
		if (isReopening) return;
		reopen({ fileId });
	};

	return (
		<LoadingButton
			size="sm"
			variant={variant ?? 'outline'}
			onClick={handleReopen}
			loading={isReopening}
			loadingText="Reopening..."
			icon={<RotateCcw />}
			className="flex items-center"
		>
			{content ?? text ?? 'Reopen'}
		</LoadingButton>
	);
}
