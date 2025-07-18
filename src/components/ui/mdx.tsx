import { toast } from 'sonner';
import { useMDX } from '~/hooks/useMDX';

import React from 'react';

import { ErrorBoundary } from 'react-error-boundary';
import { ActionTest } from '~/components/ActionTest';
import { AddBudgetButton, AddCustomBudgetButton } from '~/components/AddBudgetButton';
import { Balance } from '~/components/Balance';
import { EasterEgg } from '~/components/EasterEgg';
import { Inbox } from '~/components/Inbox';
import { Task } from '~/components/layout/Task';
import { Loading } from '~/components/Loading';
import { QuickSeek } from '~/components/QuickSeek';
import { TopUpCard } from '~/components/TopUpCard';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '~/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Badge } from '~/components/ui/badge';
import {
	Breadcrumb,
	BreadcrumbEllipsis,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '~/components/ui/breadcrumb';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '~/components/ui/card';
import { Checkbox } from '~/components/ui/checkbox';
import { CodeBlock, CodeBlockCode } from '~/components/ui/code-block';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible';
import { Combobox } from '~/components/ui/combobox';
import {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
} from '~/components/ui/command';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '~/components/ui/dialog';
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from '~/components/ui/drawer';
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuPortal,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '~/components/ui/form';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '~/components/ui/resizable';
import { ScrollArea, ScrollBar } from '~/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Separator } from '~/components/ui/separator';
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '~/components/ui/sheet';
import { Skeleton } from '~/components/ui/skeleton';
import { Slider } from '~/components/ui/slider';
import { Switch } from '~/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Textarea } from '~/components/ui/textarea';
import { Toggle } from '~/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
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
	// TwoColumn,
	// TaskConversation,
	// TaskDetailAndSubstasks,
	// TaskDetailAndChat,
	// TaskDetail,
	// Grid,
	QuickSeek,
	// ListAndDetail,
	// TaskDetailAndConversation,
	Inbox,
	Task,
	ScrollArea,
	EasterEgg,
	TopUpCard,
	ActionTest,
	// UI Components
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
	Alert,
	AlertDescription,
	AlertTitle,
	Avatar,
	AvatarFallback,
	AvatarImage,
	Badge,
	Breadcrumb,
	BreadcrumbEllipsis,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
	Checkbox,
	CodeBlock,
	CodeBlockCode,
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
	Combobox,
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuPortal,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	Input,
	Label,
	Popover,
	PopoverContent,
	PopoverTrigger,
	RadioGroup,
	RadioGroupItem,
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
	ScrollBar,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
	Skeleton,
	Slider,
	Switch,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
	Textarea,
	Toggle,
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
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

	const { Component, error, isPending } = useMDX(text.trim(), shouldRenderComponents);

	if (isPending) return <Loading />;
	if (error) return errorFallback ?? <MDXError text={text} error={error} onClickFix={onClickFix} />;

	if (!Component) throw new Error('No component found');

	return (
		<div
			className={cn(
				'whitespace-normal [&>*]:break-normal [&>*]:hyphens-none h-full max-w-full overflow-x-auto',
				className,
			)}
		>
			<ErrorBoundary
				fallbackRender={({ error }) => <MDXError text={text} error={error} onClickFix={onClickFix} />}
			>
				<Component
					components={{
						a: ({ children, href }) => (
							<a
								href={href} //
								className="text-blue-500 hover:underline break-all overflow-wrap-anywhere"
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
							<img src={src} alt={alt} className="rounded-xl max-w-full h-auto my-4" />
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
		toast.error('Coming soon.');
	};

	if (shouldShowRaw)
		return (
			<div>
				<pre className="whitespace-pre-wrap">{text.trim()}</pre>
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
