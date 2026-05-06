import React, { createContext, useContext, useEffect } from 'react';
import { Textarea } from '~/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { useSubmitHotkey } from '~/hooks/useSubmitHotkey';
import { cn } from '~/lib/utils';

type PromptInputContextType = {
	maxHeight: number | string;
	onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
	disabled?: boolean;
};

const PromptInputContext = createContext<PromptInputContextType>({
	maxHeight: 240,
	onSubmit: undefined,
	disabled: false,
});

function usePromptInput() {
	const context = useContext(PromptInputContext);
	if (!context) {
		throw new Error('usePromptInput must be used within a PromptInput');
	}
	return context;
}

type PromptInputProps = {
	maxHeight?: number | string;
	onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
	children: React.ReactNode;
	className?: string;
	disabled?: boolean;
	onKeyDown?: (e: React.KeyboardEvent<HTMLFormElement>) => void;
};

function PromptInput({
	className,
	maxHeight = 240,
	onSubmit,
	children,
	disabled = false,
	onKeyDown,
}: PromptInputProps) {
	//
	const defaultKeyDownHandler = useSubmitHotkey();

	const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
		if (onKeyDown) {
			onKeyDown(e);
		} else {
			defaultKeyDownHandler(e);
		}
	};

	return (
		<TooltipProvider>
			<PromptInputContext.Provider
				value={{
					maxHeight,
					onSubmit,
					disabled,
				}}
			>
				<form
					onSubmit={onSubmit}
					onKeyDown={handleKeyDown}
					className={cn(
						'border-input bg-background rounded-3xl border p-2 shadow-xs justify-between flex flex-col',
						className,
					)}
				>
					{children}
				</form>
			</PromptInputContext.Provider>
		</TooltipProvider>
	);
}

export type PromptInputTextareaProps = {
	disableAutosize?: boolean;
	inputRef: React.RefObject<HTMLTextAreaElement>;
} & React.ComponentProps<typeof Textarea>;

function PromptInputTextarea({
	className,
	onKeyDown,
	disableAutosize = false,
	inputRef,
	...props
}: PromptInputTextareaProps) {
	//
	const { maxHeight, disabled } = usePromptInput();

	// Auto-resize functionality
	const resizeIfNeeded = () => {
		//
		if (disableAutosize) return;
		if (!inputRef.current) return;

		inputRef.current.style.height = 'auto';
		inputRef.current.style.height =
			typeof maxHeight === 'number'
				? `${Math.min(inputRef.current.scrollHeight, maxHeight)}px`
				: `min(${inputRef.current.scrollHeight}px, ${maxHeight})`;
	};

	const handleFormReset = () => setTimeout(resizeIfNeeded, 0);

	// Set up event listeners for auto-resize
	useEffect(() => {
		//
		if (!inputRef.current) return;

		const form = inputRef.current.closest('form');
		if (!form) return console.warn('No form found (should have one)');

		inputRef.current.addEventListener('input', resizeIfNeeded); // on input, resize
		form.addEventListener('reset', handleFormReset); // after submission, resize

		return () => {
			inputRef.current?.removeEventListener('input', resizeIfNeeded);
			form.removeEventListener('reset', handleFormReset);
		};
		//
	}, [inputRef, disableAutosize, maxHeight]);

	return (
		<Textarea
			name="message"
			ref={inputRef}
			className={cn(
				'text-primary min-h-11 w-full resize-none border-none bg-transparent shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0',
				className,
			)}
			rows={1}
			disabled={disabled}
			{...props}
		/>
	);
}

type PromptInputActionsProps = React.HTMLAttributes<HTMLDivElement>;

function PromptInputActions({ children, className, ...props }: PromptInputActionsProps) {
	return (
		<div className={cn('flex items-center gap-2', className)} {...props}>
			{children}
		</div>
	);
}

type PromptInputActionProps = {
	className?: string;
	tooltip: React.ReactNode;
	children: React.ReactNode;
	side?: 'top' | 'bottom' | 'left' | 'right';
} & React.ComponentProps<typeof Tooltip>;

function PromptInputAction({ tooltip, children, className, side = 'top', ...props }: PromptInputActionProps) {
	//
	const { disabled } = usePromptInput();

	return (
		<Tooltip {...props}>
			<TooltipTrigger asChild disabled={disabled}>
				{children}
			</TooltipTrigger>
			<TooltipContent side={side} className={className}>
				{tooltip}
			</TooltipContent>
		</Tooltip>
	);
}

export { PromptInput, PromptInputAction, PromptInputActions, PromptInputTextarea };
