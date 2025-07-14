import { Expand, Minimize2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '~/lib/utils';

import { ActionComponentProps } from '~/components/actions';
import { CopyButton } from '~/components/CopyButton';
import { Button } from '~/components/ui/button';
import { Message, MessageContent } from '~/components/ui/message';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { useKeyboardShortcut } from '~/hooks/useKeyboardShortcuts';

export function SayAction(props: ActionComponentProps) {
	//
	const { action, isAuthorCurrentUser, className } = props;
	const [isFullscreen, setIsFullscreen] = useState(false);

	const toggleFullscreen = (e?: React.MouseEvent) => {
		e?.stopPropagation();
		setIsFullscreen(!isFullscreen);
	};

	if (isFullscreen) {
		return (
			<FullscreenMessage
				message={action.args['message']}
				isAuthorCurrentUser={isAuthorCurrentUser}
				onClose={toggleFullscreen}
			/>
		);
	}

	return (
		<Message isAuthorCurrentUser={isAuthorCurrentUser} className={cn(className, 'relative group')}>
			<MessageContent
				isMDX={true}
				shouldRenderComponents={false}
				text={action.args['message']}
				className={cn({
					'bg-primary text-primary-foreground': isAuthorCurrentUser,
					'bg-secondary text-secondary-foreground': !isAuthorCurrentUser,
				})}
			/>
			<div className="absolute top-1 right-1 flex gap-1">
				<ExpandButton
					onClick={toggleFullscreen}
					className="opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity"
				/>
				<CopyButton
					textToCopy={action.args['message']}
					className="opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity"
				/>
			</div>
		</Message>
	);
}

function FullscreenMessage({
	message,
	isAuthorCurrentUser,
	onClose,
}: {
	message: string;
	isAuthorCurrentUser: boolean;
	onClose: () => void;
}) {
	//
	// ESC key to close fullscreen
	useKeyboardShortcut({
		combo: { key: 'Escape' },
		callback: onClose,
		global: true,
	});

	return (
		<div className="fixed inset-0 z-50 p-4">
			{/* Close button - floating in top right */}
			<div className="absolute top-4 right-4 flex gap-2 z-10">
				<CopyButton textToCopy={message} className="opacity-70 hover:opacity-100 transition-opacity" />
				<MinimizeButton onClick={onClose} className="opacity-70 hover:opacity-100 transition-opacity" />
			</div>

			<MessageContent
				isMDX={true}
				shouldRenderComponents={false}
				text={message}
				className={cn('text-lg leading-relaxed md:max-w-full w-full h-full rounded-none', {
					'bg-primary text-primary-foreground': isAuthorCurrentUser,
					'bg-secondary text-secondary-foreground': !isAuthorCurrentUser,
				})}
			/>
		</div>
	);
}

function ExpandButton({ onClick, className }: { onClick: (e?: React.MouseEvent) => void; className?: string }) {
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="secondary"
						size="icon"
						onClick={onClick}
						className={cn('h-6 w-6 border', className)}
					>
						<Expand className="h-4 w-4" />
					</Button>
				</TooltipTrigger>
				<TooltipContent className="px-2 py-1 text-xs">Expand to fullscreen</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

function MinimizeButton({ onClick, className }: { onClick: () => void; className?: string }) {
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="secondary"
						size="icon"
						onClick={onClick}
						className={cn('h-6 w-6 border', className)}
					>
						<Minimize2 className="h-4 w-4" />
					</Button>
				</TooltipTrigger>
				<TooltipContent className="px-2 py-1 text-xs">Exit fullscreen</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
