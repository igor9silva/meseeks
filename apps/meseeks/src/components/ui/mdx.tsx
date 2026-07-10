import { useState, type MouseEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useMDX } from '~/hooks/useMDX';

import { ErrorBoundary } from '@reactor/ui/error-boundary';

import { Loading } from '~/components/Loading';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@reactor/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@reactor/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@reactor/ui/avatar';
import { Badge } from '@reactor/ui/badge';
import {
	Breadcrumb,
	BreadcrumbEllipsis,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@reactor/ui/breadcrumb';
import { Button } from '@reactor/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@reactor/ui/card';
import { Checkbox } from '@reactor/ui/checkbox';
import { CodeBlock, CodeBlockCode } from '@reactor/ui/code-block';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@reactor/ui/collapsible';
import { Combobox } from '@reactor/ui/combobox';
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
} from '@reactor/ui/command';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@reactor/ui/dialog';
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from '@reactor/ui/drawer';
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
} from '@reactor/ui/dropdown-menu';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@reactor/ui/form';
import { Input } from '@reactor/ui/input';
import { Label } from '@reactor/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@reactor/ui/popover';
import { RadioGroup, RadioGroupItem } from '@reactor/ui/radio-group';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@reactor/ui/resizable';
import { ScrollArea, ScrollBar } from '@reactor/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@reactor/ui/select';
import { Separator } from '@reactor/ui/separator';
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '@reactor/ui/sheet';
import { Skeleton } from '@reactor/ui/skeleton';
import { Slider } from '@reactor/ui/slider';
import { Switch } from '@reactor/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@reactor/ui/tabs';
import { Textarea } from '@reactor/ui/textarea';
import { Toggle } from '@reactor/ui/toggle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@reactor/ui/tooltip';
import { cn } from '@reactor/ui/lib/utils';

function toError(value: unknown): Error {
	if (value instanceof Error) return value;
	return new Error(String(value));
}

const components = {
	Separator,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	ScrollArea,
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
	shouldRenderComponents = false,
}: {
	text: string;
	onClickFix?: (e: MouseEvent, error: Error) => void;
	errorFallback?: ReactNode;
	className?: string;
	shouldRenderComponents?: boolean;
}) {
	//
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
				fallbackRender={({ error }) => <MDXError text={text} error={toError(error)} onClickFix={onClickFix} />}
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
									<CodeBlockCode code={children} language={language} />
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
						table: ({ children }) => (
							<div className="overflow-x-auto">
								<table className="w-full border-collapse my-4">{children}</table>
							</div>
						),
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
						p: ({ children }) => <p className="my-3 leading-relaxed">{children}</p>,
						strong: ({ children }) => <span className="font-bold">{children}</span>,
						em: ({ children }) => <span className="italic">{children}</span>,
						del: ({ children }) => <span className="line-through">{children}</span>,
						...(shouldRenderComponents ? components : {}),
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
	onClickFix?: (e: MouseEvent, error: Error) => void;
}) {
	//
	const [shouldShowRaw, setShouldShowRaw] = useState(false);

	const handleErrorClick = (e: MouseEvent<HTMLButtonElement>) => {
		e.stopPropagation();
		navigator.clipboard.writeText(error.message);
		toast('Error copied to clipboard.');
	};

	const handleFixClick = (e: MouseEvent<HTMLButtonElement>) => {
		e.stopPropagation();
		if (onClickFix) return onClickFix(e, error);
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
				<button
					type="button"
					onClick={handleErrorClick}
					className="text-destructive whitespace-pre-wrap text-left font-mono"
				>
					{error.message}
				</button>
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
