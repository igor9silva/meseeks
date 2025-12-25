import { Suspense, useRef, useState } from 'react';
import { cn } from '~/lib/utils';

import { ErrorBoundary } from 'react-error-boundary';
import { ActionComponentProps } from '~/components/actions';
import { GenericAction } from '~/components/actions/GenericAction';
import { RenderActionControls } from '~/components/actions/RenderActionControls';
import { FailedMessage, SimpleMessage } from '~/components/ui/message';
import { TextShimmer } from '~/components/ui/text-shimmer';
import { useIframeRenderer } from '~/hooks/useIframeRenderer';
import { useKeyboardShortcut } from '~/hooks/useKeyboardShortcuts';

export function RenderAction(props: ActionComponentProps) {
	//
	const { action, isAuthorCurrentUser } = props;

	switch (action.status) {
		//
		case 'enqueued':
		case 'skipped':
			return null;

		case 'pending authorization':
			return <GenericAction {...props} />;

		case 'failed':
			return (
				<FailedMessage
					text="🚫 Failed to render composition"
					error={action.result?.text ?? 'Compilation failed'}
					isAuthorCurrentUser={isAuthorCurrentUser}
				/>
			);

		case 'running':
			return <SimpleMessage running text="Compiling..." isAuthorCurrentUser={isAuthorCurrentUser} />;

		case 'succeeded':
			return (
				<Suspense fallback={<TextShimmer text="Rendering..." />}>
					<ErrorBoundary
						fallbackRender={({ error, resetErrorBoundary }) => (
							<div className="p-4">
								<div className="text-red-600 mb-2">Unknown error during render.</div>
								<button
									onClick={resetErrorBoundary}
									className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
								>
									Retry
								</button>
							</div>
						)}
					>
						<RenderActionContent {...props} />
					</ErrorBoundary>
				</Suspense>
			);
	}
}

function RenderActionContent(props: ActionComponentProps) {
	//
	const { action, isAuthorCurrentUser, className } = props;
	const [isFullscreen, setIsFullscreen] = useState(false);
	const iframeRef = useRef<HTMLIFrameElement>(null);

	// Get pre-transpiled code from action result
	const transpiledCode = action.result?.text || '';
	const originalCode = action.args['code'];

	// Use iframe renderer hook with pre-transpiled code
	const { dataUrl } = useIframeRenderer({ code: transpiledCode });

	const toggleFullscreen = (e?: React.MouseEvent) => {
		e?.stopPropagation();
		setIsFullscreen(!isFullscreen);
	};

	// ESC key to close fullscreen
	// TODO: make ESC from iFrame bubble out to parent
	useKeyboardShortcut({
		combo: { key: 'Escape' },
		callback: () => {
			if (isFullscreen) {
				setIsFullscreen(false);
			}
		},
		global: true,
	});

	return (
		<>
			{/* Container for relative positioning context - never hidden */}
			<div className={cn('relative group', className, isFullscreen ? 'pointer-events-none' : '')}>
				{/* Single persistent iframe that changes position only */}
				{dataUrl && (
					<iframe
						ref={iframeRef}
						src={dataUrl}
						title="Rendered Composition"
						className={cn(
							'border-none rounded-3xl pointer-events-auto',
							isFullscreen ? 'fixed inset-0 z-50 w-full h-full' : 'w-[90%] min-h-96 overflow-auto',
							{
								'bg-primary text-primary-foreground': isAuthorCurrentUser && !isFullscreen,
								'bg-secondary text-secondary-foreground': !isAuthorCurrentUser && !isFullscreen,
							},
						)}
					/>
				)}

				{/* Controls positioned based on fullscreen state */}
				<RenderActionControls
					action={action}
					code={originalCode}
					isFullscreen={isFullscreen}
					onToggleFullscreen={toggleFullscreen}
					className={cn(
						'flex gap-1 transition-opacity pointer-events-auto',
						isFullscreen
							? 'fixed top-4 right-4 opacity-70 hover:opacity-100 z-[60]'
							: 'absolute top-2 right-2 opacity-0 group-hover:opacity-50 hover:!opacity-100 z-10',
					)}
				/>
			</div>
		</>
	);
}
