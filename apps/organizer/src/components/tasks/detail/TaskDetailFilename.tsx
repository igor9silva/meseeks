import { Check, Copy, X } from 'lucide-react';
import type { FormEvent, MouseEvent, RefObject } from 'react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import type { HoldAction } from './useHoldAction';

interface TaskDetailFilenameProps {
	displayFilename: string;
	taskFileRelativePath: string;
	renameFilenameInputId: string;
	renameFilenameInputRef: RefObject<HTMLInputElement | null>;
	renameDraft: string;
	cursorFileHref: string | null;
	isRenamingFile: boolean;
	isFilePathCopied: boolean;
	isTaskFileMutationPending: boolean;
	isRenameMutationPending: boolean;
	isRenameSubmitDisabled: boolean;
	privateBlurClassName: string;
	filenameHoldAction: HoldAction;
	onRenameDraftChange: (value: string) => void;
	onRenameSubmit: (event: FormEvent<HTMLFormElement>) => void;
	onRenameCancel: () => void;
	onFilenameClick: (event: MouseEvent<HTMLAnchorElement>) => void;
	onFilePathCopy: () => void;
}

export function TaskDetailFilename({
	displayFilename,
	taskFileRelativePath,
	renameFilenameInputId,
	renameFilenameInputRef,
	renameDraft,
	cursorFileHref,
	isRenamingFile,
	isFilePathCopied,
	isTaskFileMutationPending,
	isRenameMutationPending,
	isRenameSubmitDisabled,
	privateBlurClassName,
	filenameHoldAction,
	onRenameDraftChange,
	onRenameSubmit,
	onRenameCancel,
	onFilenameClick,
	onFilePathCopy,
}: TaskDetailFilenameProps) {
	//
	return (
		<div className="min-w-0 text-sm leading-7">
			{isRenamingFile ? (
				<form className="flex w-full min-w-0 items-center gap-1" onSubmit={onRenameSubmit}>
					<label className="sr-only" htmlFor={renameFilenameInputId}>
						Filename
					</label>
					<Input
						ref={renameFilenameInputRef}
						id={renameFilenameInputId}
						value={renameDraft}
						onChange={(event) => onRenameDraftChange(event.currentTarget.value)}
						onKeyDown={(event) => {
							if (event.key === 'Escape') onRenameCancel();
						}}
						disabled={isRenameMutationPending}
						autoComplete="off"
						className="h-7 min-w-0 flex-1 text-sm"
					/>
					<Button
						type="submit"
						size="xs"
						variant="secondary"
						aria-label="Save filename"
						disabled={isRenameSubmitDisabled}
					>
						<Check className="size-3" />
					</Button>
					<Button
						type="button"
						size="xs"
						variant="ghost"
						aria-label="Cancel filename rename"
						onClick={onRenameCancel}
						disabled={isRenameMutationPending}
					>
						<X className="size-3" />
					</Button>
				</form>
			) : (
				<div className="flex max-w-full min-w-0 items-baseline gap-1">
					{cursorFileHref ? (
						<a
							href={cursorFileHref}
							target="_blank"
							rel="noopener"
							onPointerDown={filenameHoldAction.handlePointerDown}
							onPointerUp={filenameHoldAction.handlePointerEnd}
							onPointerLeave={filenameHoldAction.handlePointerEnd}
							onPointerCancel={filenameHoldAction.handlePointerEnd}
							onClick={onFilenameClick}
							title="Click to open. Hold to rename."
							className={`min-w-0 break-words leading-7 text-foreground/80 underline underline-offset-4 hover:text-foreground ${privateBlurClassName}`}
						>
							{displayFilename}
						</a>
					) : (
						<button
							type="button"
							onPointerDown={filenameHoldAction.handlePointerDown}
							onPointerUp={filenameHoldAction.handlePointerEnd}
							onPointerLeave={filenameHoldAction.handlePointerEnd}
							onPointerCancel={filenameHoldAction.handlePointerEnd}
							disabled={isTaskFileMutationPending}
							title="Hold to rename file"
							className={`min-w-0 break-words text-left leading-7 text-foreground/80 hover:text-foreground hover:underline hover:underline-offset-4 disabled:cursor-default disabled:hover:no-underline ${privateBlurClassName}`}
						>
							{displayFilename}
						</button>
					)}
					<Button
						type="button"
						size="icon-xs"
						variant="outline"
						aria-label={isFilePathCopied ? 'Copied' : 'Copy relative file path'}
						title={`Copy ${taskFileRelativePath}`}
						disabled={isFilePathCopied}
						onClick={onFilePathCopy}
						className="relative self-start disabled:opacity-100"
					>
						<div className={`transition-all ${isFilePathCopied ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
							<Check className="size-3 stroke-emerald-500" aria-hidden="true" />
						</div>
						<div className={`absolute transition-all ${isFilePathCopied ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}>
							<Copy className="size-3" aria-hidden="true" />
						</div>
					</Button>
				</div>
			)}
		</div>
	);
}
