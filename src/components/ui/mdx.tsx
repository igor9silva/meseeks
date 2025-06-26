import { toast } from 'sonner';
import { useMDX } from '~/hooks/useMDX';

import React from 'react';

import { ErrorBoundary } from 'react-error-boundary';
import { AddBudgetButton, AddCustomBudgetButton } from '~/components/AddBudgetButton';
import { Balance } from '~/components/Balance';
import { EasterEgg } from '~/components/EasterEgg';
import { Inbox } from '~/components/Inbox';
import { Grid } from '~/components/layout/Grid';
import { ListAndDetail } from '~/components/layout/ListAndDetail';
import { Task } from '~/components/layout/Task';
import { TaskDetailAndConversation } from '~/components/layout/TaskDetailAndConversation';
import { TwoColumn } from '~/components/layout/TwoColumn';
import { Loading } from '~/components/Loading';
import { QuickAdd } from '~/components/QuickAdd';
import { TaskConversation } from '~/components/TaskConversation';
import TaskDetail from '~/components/TaskDetail';
import { TaskDetailAndChat } from '~/components/TaskDetailAndChat';
import { TaskDetailAndSubstasks } from '~/components/TaskDetailAndSubstasks';
import { TopUpCard } from '~/components/TopUpCard';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '~/components/ui/card';
import { CodeBlock, CodeBlockCode } from '~/components/ui/code-block';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Separator } from '~/components/ui/separator';
import { useSetupWindowGlobals } from '~/hooks/useSetupWindowGlobals';
import { cn } from '~/lib/utils';

const components = {
	AddBudgetButton,
	AddCustomBudgetButton,
	Balance,
	Separator,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	TwoColumn,
	TaskConversation,
	TaskDetailAndSubstasks,
	TaskDetailAndChat,
	TaskDetail,
	Grid,
	QuickAdd,
	ListAndDetail,
	TaskDetailAndConversation,
	Inbox,
	Task,
	ScrollArea,
	EasterEgg,
	TopUpCard,
};

export default function MDX({
	text, //
	onClickFix,
	errorFallback,
	className,
	shouldRenderComponents = true,
}: {
	text: string;
	onClickFix?: (e: React.MouseEvent) => void;
	errorFallback?: React.ReactNode;
	className?: string;
	shouldRenderComponents?: boolean;
}) {
	//
	useSetupWindowGlobals();

	const { Component, error, isPending } = useMDX(text, shouldRenderComponents);

	if (isPending) return <Loading />;
	if (error) return errorFallback ?? <MDXError text={text} error={error} onClickFix={onClickFix} />;

	if (!Component) throw new Error('No component found');

	return (
		<div className={cn('whitespace-normal [&>*]:break-normal [&>*]:hyphens-auto h-full', className)}>
			<ErrorBoundary
				fallbackRender={({ error }) => <MDXError text={text} error={error} onClickFix={onClickFix} />}
			>
				<Component
					components={{
						a: ({ children, href }) => (
							<a
								href={href} //
								className="text-blue-500 hover:underline"
								target="_blank"
								rel="noopener"
							>
								{children}
							</a>
						),
						code: function CodeComponent({ className, children, ...props }) {
							//
							const language = extractLanguage(className);

							// check if the code is inline (claude randomly added that, thanks!)
							if (typeof children !== 'string' || children.includes('\n') === false) {
								return (
									<span
										className={cn(
											'bg-muted text-foreground rounded-sm px-1 py-0.5 font-mono text-sm',
											className,
										)}
										{...props}
									>
										{children}
									</span>
								);
							}

							return (
								<CodeBlock className={className}>
									<CodeBlockCode code={children as string} language={language} />
								</CodeBlock>
							);
						},
						pre: function PreComponent({ children }) {
							return <>{children}</>;
						},
						blockquote: ({ children }) => (
							<blockquote className="pl-4 border-l-4 border-muted-foreground/20 italic my-4 text-muted-foreground">
								{children}
							</blockquote>
						),
						table: ({ children }) => <table className="w-full border-collapse my-4">{children}</table>,
						td: ({ children }) => <td className="border border-border p-2">{children}</td>,
						th: ({ children }) => (
							<th className="border border-border p-2 font-bold text-primary">{children}</th>
						),
						tr: ({ children }) => <tr className="even:bg-muted/50">{children}</tr>,
						thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
						tbody: ({ children }) => <tbody className="">{children}</tbody>,
						img: ({ src, alt }) => (
							<img src={src} alt={alt} className="rounded-md max-w-full h-auto my-4" />
						),
						ul: ({ children }) => <ul className="ml-8 list-disc space-y-1 my-2">{children}</ul>,
						ol: ({ children }) => <ol className="ml-8 list-decimal space-y-1 my-2">{children}</ol>,
						li: ({ children }) => <li className="leading-normal">{children}</li>,
						hr: () => <hr className="my-4 border-t border-border" />,
						h1: ({ children }) => <h1 className="text-2xl font-bold mt-6 mb-2">{children}</h1>,
						h2: ({ children }) => <h2 className="text-xl font-bold mt-5 mb-2">{children}</h2>,
						h3: ({ children }) => <h3 className="text-lg font-bold mt-4 mb-2">{children}</h3>,
						h4: ({ children }) => <h4 className="text-base font-bold mt-3 mb-2">{children}</h4>,
						h5: ({ children }) => <h5 className="text-sm font-bold mt-2 mb-1">{children}</h5>,
						h6: ({ children }) => <h6 className="text-xs font-bold mt-2 mb-1">{children}</h6>,
						p: ({ children }) => <p className="my-2 md:my-1 leading-relaxed">{children}</p>,
						strong: ({ children }) => <span className="font-bold">{children}</span>,
						em: ({ children }) => <span className="italic">{children}</span>,
						del: ({ children }) => <span className="line-through">{children}</span>,
						...components,
					}}
				/>
			</ErrorBoundary>
		</div>
	);
}

function MDXError({
	text, //
	error,
	onClickFix,
}: {
	text: string;
	error: Error;
	onClickFix?: (e: React.MouseEvent) => void;
}) {
	//
	const [shouldShowRaw, setShouldShowRaw] = React.useState(false);

	const handleErrorClick = (e: React.MouseEvent<HTMLPreElement>) => {
		e.stopPropagation();
		navigator.clipboard.writeText(error.message);
		toast('Error copied to clipboard.');
	};

	const handleFixClick = (e: React.MouseEvent<HTMLButtonElement>) => {
		e.stopPropagation();
		if (onClickFix) return onClickFix(e);
		toast.error('Not implemented yet.');
	};

	if (shouldShowRaw)
		return (
			<div>
				<pre className="whitespace-pre-wrap">{text}</pre>
				<br />
				<Button onClick={() => setShouldShowRaw(false)}>Try rendering again</Button>
			</div>
		);

	return (
		<div className="flex flex-col gap-2">
			<div className="flex flex-col">
				<p>Error loading content:</p>
				<pre onClick={handleErrorClick} className="text-destructive whitespace-pre-wrap">
					{error.message}
				</pre>
			</div>
			<div className="flex flex-row gap-1">
				<Button onClick={handleFixClick}>Fix it</Button>
				<Button onClick={() => setShouldShowRaw(true)}>Show raw</Button>
			</div>
		</div>
	);
}

function extractLanguage(className?: string): string {
	if (!className) return 'plaintext';
	const match = className.match(/language-(\w+)/);
	return match ? match[1] : 'plaintext';
}
