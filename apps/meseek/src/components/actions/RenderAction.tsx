import { Suspense, useEffect, useRef } from 'react';
import { cn } from '@reactor/ui/lib/utils';

import { ErrorBoundary } from '@reactor/ui/error-boundary';
import { z } from 'zod/v3';
import { ActionComponentProps } from '~/components/actions';
import { GenericAction } from '~/components/actions/GenericAction';
import { RenderActionControls } from '~/components/actions/RenderActionControls';
import { FailedMessage, SimpleMessage } from '~/components/ui/message';
import { TextShimmer } from '@reactor/ui/text-shimmer';
import { useFullscreenAction } from '@reactor/ui/hooks/useFullscreenAction';
import { useIframeRenderer } from '~/hooks/useIframeRenderer';

const renderActionArgsSchema = z.object({
	code: z.string(),
});

const renderDoubleTapMessageSchema = z.object({
	type: z.literal('meseeks:render-double-tap'),
});

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
					text="Failed to render composition"
					error={action.result?.text ?? 'Compilation failed'}
					isAuthorCurrentUser={isAuthorCurrentUser}
				/>
			);

		case 'running':
			return <SimpleMessage running text="Compiling..." isAuthorCurrentUser={isAuthorCurrentUser} />;

		case 'succeeded':
			return (
				<Suspense fallback={<TextShimmer text="Rendering..." />}>
					<ErrorBoundary fallbackRender={ErrorFallback}>
						<RenderActionContent {...props} />
					</ErrorBoundary>
				</Suspense>
			);
	}
}

function ErrorFallback({ error, resetErrorBoundary }: { error: unknown; resetErrorBoundary: () => void }) {
	//
	console.error(error);

	return (
		<div className="p-4">
			<div className="text-red-600 mb-2">Unknown error during render.</div>
			<button
				onClick={resetErrorBoundary}
				className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
			>
				Retry
			</button>
		</div>
	);
}

function RenderActionContent(props: ActionComponentProps) {
	//
	const { action, isAuthorCurrentUser, className } = props;
	const fullscreen = useFullscreenAction();
	const iframeRef = useRef<HTMLIFrameElement>(null);

	// Get pre-transpiled code from action result
	const transpiledCode = action.result?.text || '';
	const parsedArgs = renderActionArgsSchema.safeParse(action.args);
	const originalCode = parsedArgs.success ? parsedArgs.data.code : '';

	// Use iframe renderer hook with pre-transpiled code
	const { iframeHtml } = useIframeRenderer({ code: transpiledCode });
	const toggleFullscreen = fullscreen.toggle;

	useEffect(() => {
		//
		const handleMessage = (event: MessageEvent<unknown>) => {
			//
			if (event.source !== iframeRef.current?.contentWindow) return;

			const parsedMessage = renderDoubleTapMessageSchema.safeParse(event.data);
			if (!parsedMessage.success) return;

			toggleFullscreen();
		};

		window.addEventListener('message', handleMessage);
		return () => window.removeEventListener('message', handleMessage);
	}, [toggleFullscreen]);

	return (
		<>
			{/* Container for relative positioning context - never hidden */}
			<div
				ref={fullscreen.containerRef}
				style={fullscreen.placeholderStyle}
				className={cn('relative group', className, fullscreen.isFullscreen ? 'pointer-events-none' : '')}
				onTouchEnd={fullscreen.isFullscreen ? undefined : fullscreen.handleOpenDoubleTap}
			>
				{/* Single persistent iframe that changes position only */}
				{iframeHtml && (
					<iframe
						ref={iframeRef}
						srcDoc={iframeHtml}
						title="Rendered Composition"
						className={cn(
							'border-none pointer-events-auto',
							fullscreen.isFullscreen
								? 'fixed inset-0 z-50 w-full h-full overscroll-contain'
								: 'w-full min-h-96 overflow-auto rounded-3xl',
							{
								'bg-primary text-primary-foreground': isAuthorCurrentUser && !fullscreen.isFullscreen,
								'bg-secondary text-secondary-foreground':
									!isAuthorCurrentUser && !fullscreen.isFullscreen,
							},
						)}
					/>
				)}

				{/* Controls positioned based on fullscreen state */}
				<RenderActionControls
					action={action}
					code={originalCode}
					isFullscreen={fullscreen.isFullscreen}
					onToggleFullscreen={fullscreen.toggle}
					className={cn(
						'flex gap-1 transition-opacity pointer-events-auto',
						fullscreen.isFullscreen
							? 'fixed top-4 right-4 opacity-70 hover:opacity-100 z-[60]'
							: 'absolute top-2 right-2 opacity-0 group-hover:opacity-50 hover:!opacity-100 z-10',
					)}
				/>
			</div>
		</>
	);
}
