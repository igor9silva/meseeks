import { Check, Crosshair, ListChecks, X } from 'lucide-react';
import type { FormEvent, RefObject } from 'react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import type { HoldAction } from './useHoldAction';

interface TaskDetailTitleProps {
	title: string;
	titleInputId: string;
	titleInputRef: RefObject<HTMLInputElement | null>;
	titleDraft: string;
	isEditingTitle: boolean;
	isTaskFileMutationPending: boolean;
	isTitleMutationPending: boolean;
	isTitleSubmitDisabled: boolean;
	privateBlurClassName: string;
	codexPlanHref: string;
	codexSeekHref: string;
	titleHoldAction: HoldAction;
	onTitleDraftChange: (value: string) => void;
	onTitleSubmit: (event: FormEvent<HTMLFormElement>) => void;
	onTitleEditCancel: () => void;
}

export function TaskDetailTitle({
	title,
	titleInputId,
	titleInputRef,
	titleDraft,
	isEditingTitle,
	isTaskFileMutationPending,
	isTitleMutationPending,
	isTitleSubmitDisabled,
	privateBlurClassName,
	codexPlanHref,
	codexSeekHref,
	titleHoldAction,
	onTitleDraftChange,
	onTitleSubmit,
	onTitleEditCancel,
}: TaskDetailTitleProps) {
	//
	return (
		<div className="w-fit max-w-full shrink-0">
			{isEditingTitle ? (
				<form className="flex max-w-full min-w-64 items-center gap-1" onSubmit={onTitleSubmit}>
					<label className="sr-only" htmlFor={titleInputId}>
						Title
					</label>
					<Input
						ref={titleInputRef}
						id={titleInputId}
						value={titleDraft}
						onChange={(event) => onTitleDraftChange(event.currentTarget.value)}
						onKeyDown={(event) => {
							if (event.key === 'Escape') onTitleEditCancel();
						}}
						disabled={isTitleMutationPending}
						autoComplete="off"
						className="h-9 min-w-64 flex-1 text-base font-semibold md:text-xl"
					/>
					<Button
						type="submit"
						size="xs"
						variant="secondary"
						aria-label="Save title"
						disabled={isTitleSubmitDisabled}
					>
						<Check className="size-3" />
					</Button>
					<Button
						type="button"
						size="xs"
						variant="ghost"
						aria-label="Cancel title edit"
						onClick={onTitleEditCancel}
						disabled={isTitleMutationPending}
					>
						<X className="size-3" />
					</Button>
				</form>
			) : (
				<div className="flex w-fit max-w-full flex-wrap items-baseline gap-x-2 gap-y-1">
					<h2 className="min-w-0 text-xl font-semibold leading-7">
						<button
							type="button"
							onPointerDown={titleHoldAction.handlePointerDown}
							onPointerUp={titleHoldAction.handlePointerEnd}
							onPointerLeave={titleHoldAction.handlePointerEnd}
							onPointerCancel={titleHoldAction.handlePointerEnd}
							disabled={isTaskFileMutationPending}
							title="Hold to edit title"
							className={`inline break-words text-left text-foreground hover:underline hover:underline-offset-4 disabled:cursor-default disabled:hover:no-underline ${privateBlurClassName}`}
						>
							{title}
						</button>
					</h2>
					<span className="inline-flex items-baseline gap-2">
						<a
							href={codexPlanHref}
							target="_blank"
							rel="noopener"
							className={`text-sm font-normal leading-7 text-foreground/80 underline underline-offset-4 hover:text-foreground ${privateBlurClassName}`}
						>
							<ListChecks className="mr-1 inline size-4 align-text-bottom" /> Plan
						</a>
						<a
							href={codexSeekHref}
							target="_blank"
							rel="noopener"
							className={`text-sm font-normal leading-7 text-foreground/80 underline underline-offset-4 hover:text-foreground ${privateBlurClassName}`}
						>
							<Crosshair className="mr-1 inline size-4 align-text-bottom" /> Seek
						</a>
					</span>
				</div>
			)}
		</div>
	);
}
