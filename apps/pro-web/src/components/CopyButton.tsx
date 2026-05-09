import { CheckIcon, CopyIcon } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@reactor/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@reactor/ui/tooltip';
import { cn } from '@reactor/ui/lib/utils';

const TIME_TO_REVERT_MS = 1500;

export function CopyButton({
	textToCopy, //
	tooltipText = 'Click to copy',
	className,
}: {
	textToCopy: string;
	tooltipText?: string;
	className?: string;
}) {
	const [copied, setCopied] = useState<boolean>(false);

	const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
		e.stopPropagation();
		e.preventDefault();

		try {
			await navigator.clipboard.writeText(textToCopy);
			setCopied(true);
			setTimeout(() => setCopied(false), TIME_TO_REVERT_MS);
		} catch (err) {
			console.error('Failed to copy text: ', err);
		}
	};

	return (
		<TooltipProvider delayDuration={0}>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="outline"
						size="icon"
						className={cn('disabled:opacity-100 h-6 w-6', className)}
						onClick={handleCopy}
						aria-label={copied ? 'Copied' : tooltipText}
						disabled={copied}
					>
						<div className={cn('transition-all', copied ? 'scale-100 opacity-100' : 'scale-0 opacity-0')}>
							<CheckIcon className="stroke-emerald-500" size={16} aria-hidden="true" />
						</div>
						<div
							className={cn(
								'absolute transition-all',
								copied ? 'scale-0 opacity-0' : 'scale-100 opacity-100',
							)}
						>
							<CopyIcon size={16} aria-hidden="true" />
						</div>
					</Button>
				</TooltipTrigger>
				<TooltipContent className="px-2 py-1 text-xs">{tooltipText}</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
