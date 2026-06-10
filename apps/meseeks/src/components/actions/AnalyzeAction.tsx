import { ChevronDown, CodeXml, Expand, Minimize2 } from 'lucide-react';
import { useState } from 'react';
import type { MouseEvent, TouchEvent } from 'react';
import { z } from 'zod/v3';

import { ActionComponentProps } from '~/components/actions';
import { GenericAction } from '~/components/actions/GenericAction';
import { CopyButton } from '~/components/CopyButton';
import { Button } from '@pro/ui/button';
import { CodeBlock, CodeBlockCode } from '@pro/ui/code-block';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@pro/ui/collapsible';
import { FailedMessage, Message, SimpleMessage } from '~/components/ui/message';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@pro/ui/tooltip';
import { useFullscreenAction } from '@pro/ui/hooks/useFullscreenAction';
import { cn } from '@pro/ui/lib/utils';

const analyzeActionArgsSchema = z.object({
	code: z.string(),
	language: z.string().optional(),
});

export function AnalyzeAction(props: ActionComponentProps) {
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
			return <Error {...props} />;

		case 'running':
			return <SimpleMessage running text={`Running code...`} isAuthorCurrentUser={isAuthorCurrentUser} />;

		case 'succeeded':
			return <Success {...props} />;
	}
}

function Error({ action, isAuthorCurrentUser }: ActionComponentProps) {
	return (
		<FailedMessage
			text={`Failed to run code`}
			error={action.result?.text ?? ''}
			isAuthorCurrentUser={isAuthorCurrentUser}
		/>
	);
}

function Success(props: ActionComponentProps) {
	//
	const { action, isAuthorCurrentUser, className } = props;
	const [isOpen, setIsOpen] = useState(false);
	const fullscreen = useFullscreenAction();

	const parsedArgs = analyzeActionArgsSchema.safeParse(action.args);
	const code = parsedArgs.success ? parsedArgs.data.code : '';
	const language = parsedArgs.success ? parsedArgs.data.language : undefined;
	const output = action.result?.text ?? '';

	return (
		<>
			<Message
				isAuthorCurrentUser={isAuthorCurrentUser}
				className={cn(className, 'relative group')}
				onTouchEnd={fullscreen.handleOpenDoubleTap}
			>
				<div
					className={cn('rounded-xl p-2 text-foreground w-full md:w-[95%]', {
						'bg-primary text-primary-foreground': isAuthorCurrentUser,
						'bg-secondary text-secondary-foreground': !isAuthorCurrentUser,
					})}
				>
					<Collapsible open={isOpen} onOpenChange={setIsOpen}>
						<CollapsibleTrigger className="flex cursor-pointer items-center gap-1 text-sm text-muted-foreground">
							<CodeXml className="size-4" />
							<span>Run code</span>
							<div className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
								<ChevronDown className="size-4" />
							</div>
						</CollapsibleTrigger>

						{/* Output - always shown */}
						<div className="mt-2 space-y-2">
							{isOpen && <div className="text-sm font-medium text-foreground">Output</div>}
							<div
								className={cn(
									'border border-border bg-background rounded-md p-3 overflow-auto relative group/output',
									{
										'max-h-64': isOpen,
										'max-h-32': !isOpen,
									},
								)}
							>
								<CopyButton
									textToCopy={output}
									className="absolute top-2 right-2 opacity-0 group-hover/output:opacity-50 hover:!opacity-100 transition-opacity z-10"
								/>
								<pre className="whitespace-pre text-sm font-mono text-foreground">
									{output || '(no output)'}
								</pre>
							</div>
						</div>

						<CollapsibleContent className="mt-2 space-y-3">
							{/* Code - shown only when expanded */}
							<div className="text-sm font-medium text-foreground">Code</div>
							<div className="max-h-80 overflow-auto relative group/code">
								<div className="absolute top-2 right-2 z-10">
									<CopyButton
										textToCopy={code}
										className="opacity-0 group-hover/code:opacity-50 hover:!opacity-100 transition-opacity"
									/>
								</div>
								<CodeBlock>
									<CodeBlockCode code={code} language={language ?? 'python'} />
								</CodeBlock>
							</div>
						</CollapsibleContent>
					</Collapsible>
				</div>
				<div className="absolute top-1 right-1" onTouchEnd={(event) => event.stopPropagation()}>
					<ExpandButton
						onClick={fullscreen.toggle}
						className="opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity"
					/>
				</div>
			</Message>
			{fullscreen.isFullscreen && (
				<FullscreenAnalyzeAction
					code={code}
					language={language}
					output={output}
					isAuthorCurrentUser={isAuthorCurrentUser}
					onClose={fullscreen.close}
					onDoubleTap={fullscreen.handleCloseDoubleTap}
				/>
			)}
		</>
	);
}

function FullscreenAnalyzeAction({
	code,
	language,
	output,
	isAuthorCurrentUser,
	onClose,
	onDoubleTap,
}: {
	code: string;
	language: string | undefined;
	output: string;
	isAuthorCurrentUser: boolean;
	onClose: () => void;
	onDoubleTap: (event: TouchEvent) => void;
}) {
	//
	return (
		<div className="fixed inset-0 z-50 overflow-auto overscroll-contain" onTouchEnd={onDoubleTap}>
			{/* Close button - floating in top right */}
			<div className="fixed top-4 right-4 z-10" onTouchEnd={(event) => event.stopPropagation()}>
				<MinimizeButton onClick={onClose} className="opacity-70 hover:opacity-100 transition-opacity" />
			</div>

			<div
				className={cn('min-h-full w-full p-4', {
					'bg-primary text-primary-foreground': isAuthorCurrentUser,
					'bg-secondary text-secondary-foreground': !isAuthorCurrentUser,
				})}
			>
				<div className="space-y-6 max-w-full">
					{/* Output */}
					<div className="space-y-3">
						<div className="text-base font-medium">Output</div>
						<div className="border border-border bg-background rounded-md p-4 max-h-96 overflow-auto relative group/output">
							<CopyButton
								textToCopy={output}
								className="absolute top-2 right-2 opacity-70 hover:opacity-100 transition-opacity z-10"
							/>
							<pre className="whitespace-pre text-sm font-mono text-foreground">
								{output || '(no output)'}
							</pre>
						</div>
					</div>

					{/* Code */}
					<div className="space-y-3">
						<div className="text-base font-medium">Code</div>
						<div className="max-h-96 overflow-auto relative group/code">
							<div className="absolute top-2 right-2 z-10">
								<CopyButton
									textToCopy={code}
									className="opacity-70 hover:opacity-100 transition-opacity"
								/>
							</div>
							<CodeBlock>
								<CodeBlockCode code={code} language={language ?? 'python'} />
							</CodeBlock>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

function ExpandButton({ onClick, className }: { onClick: (e?: MouseEvent) => void; className?: string }) {
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
