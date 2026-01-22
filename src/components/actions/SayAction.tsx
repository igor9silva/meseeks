import { useNavigate } from '@tanstack/react-router';
import { AlignJustify, Bug, Expand, Minimize2, TextQuote } from 'lucide-react';
import { useState } from 'react';
import { cn } from '~/lib/utils';

import { ActionComponentProps } from '~/components/actions';
import { CopyButton } from '~/components/CopyButton';
import { Button } from '~/components/ui/button';
import { Message, MessageContent } from '~/components/ui/message';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { useKeyboardShortcut } from '~/hooks/useKeyboardShortcuts';
import { useSay } from '~/hooks/useTaskMutations';

export function SayAction(props: ActionComponentProps & { shouldRenderComponents?: boolean; contentKey?: string }) {
	//
	const {
		action,
		taskId,
		isAuthorCurrentUser,
		className,
		shouldRenderComponents = false,
		contentKey = 'message',
	} = props;
	const [isFullscreen, setIsFullscreen] = useState(false);

	const toggleFullscreen = (e?: React.MouseEvent) => {
		e?.stopPropagation();
		setIsFullscreen(!isFullscreen);
	};

	const { say, isSaying } = useSay();

	if (isFullscreen) {
		return (
			<FullscreenMessage
				message={action.args[contentKey]}
				isAuthorCurrentUser={isAuthorCurrentUser}
				onClose={toggleFullscreen}
				action={action}
				shouldRenderComponents={shouldRenderComponents}
			/>
		);
	}

	const onClickFix = (e: React.MouseEvent, error: Error) => {
		e.stopPropagation();
		if (isSaying) return;
		say({
			taskId,
			message: `The ${action.skillKey} action above failed. Error details: ${error.message}. Please fix it.`,
		});
	};

	return (
		<Message isAuthorCurrentUser={isAuthorCurrentUser} className={cn(className, 'relative group')}>
			<MessageContent
				isMDX={true}
				shouldRenderComponents={shouldRenderComponents}
				onClickMDXFix={shouldRenderComponents ? onClickFix : undefined}
				text={action.args[contentKey]}
				className={cn({
					'bg-primary text-primary-foreground p-3': isAuthorCurrentUser,
					'px-0': !isAuthorCurrentUser,
				})}
			/>
			<div className="absolute top-1 right-1 flex gap-1">
				<DebugButton
					action={action}
					className="opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity"
				/>
				<ExpandButton
					onClick={toggleFullscreen}
					className="opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity"
				/>
				<CopyButton
					textToCopy={action.args[contentKey]}
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
	action,
	shouldRenderComponents,
}: {
	message: string;
	isAuthorCurrentUser: boolean;
	onClose: () => void;
	action: ActionComponentProps['action'];
	shouldRenderComponents: boolean;
}) {
	//
	const [isReaderMode, setIsReaderMode] = useState(false);

	// ESC key to close fullscreen
	useKeyboardShortcut({
		combo: { key: 'Escape' },
		callback: onClose,
		global: true,
	});

	return (
		<div className="fixed inset-0 z-50 overflow-auto bg-background text-foreground">
			{/* floating controls */}
			<div className="fixed top-4 right-4 flex gap-2 z-10">
				<ReaderModeButton
					isReaderMode={isReaderMode}
					onClick={() => setIsReaderMode(!isReaderMode)}
					className="opacity-70 hover:opacity-100 transition-opacity"
				/>
				<CopyButton textToCopy={message} className="opacity-70 hover:opacity-100 transition-opacity" />
				<DebugButton action={action} className="opacity-70 hover:opacity-100 transition-opacity" />
				<MinimizeButton onClick={onClose} className="opacity-70 hover:opacity-100 transition-opacity" />
			</div>

			{/* content wrapper that controls width */}
			<div
				className={cn(
					'min-h-full p-4 mx-auto transition-[max-width] duration-300 ease-out',
					isReaderMode ? 'max-w-prose' : 'max-w-full',
				)}
			>
				<MessageContent
					isMDX={true}
					shouldRenderComponents={shouldRenderComponents}
					text={message}
					className="text-lg leading-relaxed rounded-none p-0 max-w-none md:max-w-none"
				/>
			</div>
		</div>
	);
}

function ExpandButton({ onClick, className }: { onClick: (e?: React.MouseEvent) => void; className?: string }) {
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button variant="outline" size="icon" onClick={onClick} className={cn('h-6 w-6 border', className)}>
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
					<Button variant="outline" size="icon" onClick={onClick} className={cn('h-6 w-6 border', className)}>
						<Minimize2 className="h-4 w-4" />
					</Button>
				</TooltipTrigger>
				<TooltipContent className="px-2 py-1 text-xs">Exit fullscreen</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

function DebugButton({ action, className }: { action: ActionComponentProps['action']; className?: string }) {
	//
	const navigate = useNavigate();

	const handleDebugClick = (e?: React.MouseEvent) => {
		e?.stopPropagation();

		// Navigate to dev mode with action anchor
		navigate({
			to: '/$',
			search: (prev) => ({ ...prev, debug: true }),
			hash: `action-${action._id}`,
		});
	};

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="outline"
						size="icon"
						onClick={handleDebugClick}
						className={cn('h-6 w-6 border', className)}
					>
						<Bug className="h-4 w-4" />
					</Button>
				</TooltipTrigger>
				<TooltipContent className="px-2 py-1 text-xs">Inspect in dev mode</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

function ReaderModeButton({
	isReaderMode,
	onClick,
	className,
}: {
	isReaderMode: boolean;
	onClick: () => void;
	className?: string;
}) {
	//
	const Icon = isReaderMode ? AlignJustify : TextQuote;
	const tooltip = isReaderMode ? 'Full width' : 'Reader mode';

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button variant="outline" size="icon" onClick={onClick} className={cn('h-6 w-6 border', className)}>
						<Icon className="h-4 w-4" />
					</Button>
				</TooltipTrigger>
				<TooltipContent className="px-2 py-1 text-xs">{tooltip}</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
