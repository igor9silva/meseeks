import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@radix-ui/react-collapsible';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import MDX from '~/components/ui/mdx';
import { TextShimmer } from '~/components/ui/text-shimmer';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { cn } from '~/lib/utils';

export type MessageProps = {
	children: React.ReactNode;
	isAuthorCurrentUser: boolean;
	className?: string;
} & React.HTMLProps<HTMLDivElement>;

const Message = ({ children, className, isAuthorCurrentUser, ...props }: MessageProps) => (
	<div
		className={cn(
			'flex gap-3', //
			isAuthorCurrentUser ? 'justify-end' : 'justify-start',
			className,
		)}
		{...props}
	>
		{children}
	</div>
);

export type MessageAvatarProps = {
	src: string;
	alt: string;
	fallback?: string;
	delayMs?: number;
	className?: string;
};

const MessageAvatar = ({ src, alt, fallback, delayMs, className }: MessageAvatarProps) => {
	return (
		<Avatar className={cn('size-8 flex-shrink-0', className)}>
			<AvatarImage src={src} alt={alt} />
			{fallback && <AvatarFallback delayMs={delayMs}>{fallback}</AvatarFallback>}
		</Avatar>
	);
};

export type MessageContentProps = {
	text: string;
	className?: string;
	isMDX?: boolean;
	shouldRenderComponents?: boolean;
} & React.HTMLProps<HTMLDivElement>;

const MessageContent = ({
	text,
	className,
	isMDX = false,
	shouldRenderComponents = false,
	...props
}: MessageContentProps) => {
	//
	return isMDX ? (
		<MDX
			shouldRenderComponents={shouldRenderComponents}
			text={text}
			className={cn(
				'rounded-lg text-foreground max-w-full md:max-w-[95%] break-normal hyphens-auto whitespace-normal',
				className,
			)}
			{...props}
		/>
	) : (
		<div className={cn('text-sm text-muted-foreground', className)} {...props}>
			{text}
		</div>
	);
};

export type MessageActionsProps = {
	children: React.ReactNode;
	className?: string;
} & React.HTMLProps<HTMLDivElement>;

const MessageActions = ({ children, className, ...props }: MessageActionsProps) => (
	<div className={cn('text-muted-foreground flex items-center gap-2', className)} {...props}>
		{children}
	</div>
);

export type MessageActionProps = {
	className?: string;
	tooltip: React.ReactNode;
	children: React.ReactNode;
	side?: 'top' | 'bottom' | 'left' | 'right';
} & React.ComponentProps<typeof Tooltip>;

const MessageAction = ({ tooltip, children, className, side = 'top', ...props }: MessageActionProps) => {
	return (
		<TooltipProvider>
			<Tooltip {...props}>
				<TooltipTrigger asChild>{children}</TooltipTrigger>
				<TooltipContent side={side} className={className}>
					{tooltip}
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
};

const SimpleMessage = ({
	text,
	running,
	isAuthorCurrentUser,
}: {
	text: string;
	running?: boolean;
	isAuthorCurrentUser: boolean;
}) => (
	<Message isAuthorCurrentUser={isAuthorCurrentUser}>
		{running ? (
			<TextShimmer text={text} /> //
		) : (
			<MessageContent text={text} />
		)}
	</Message>
);

const FailedMessage = ({
	text,
	error,
	isAuthorCurrentUser,
}: {
	text: string;
	error: string;
	isAuthorCurrentUser: boolean;
}) => (
	<Message isAuthorCurrentUser={isAuthorCurrentUser}>
		<Collapsible>
			<CollapsibleTrigger>
				<MessageContent className="text-sm text-muted-foreground text-left" text={text} />
			</CollapsibleTrigger>
			<CollapsibleContent>
				<pre className="text-sm text-muted-foreground text-left whitespace-pre-wrap break-normal hyphens-auto">
					{error}
				</pre>
			</CollapsibleContent>
		</Collapsible>
	</Message>
);

export { FailedMessage, Message, MessageAction, MessageActions, MessageAvatar, MessageContent, SimpleMessage };
