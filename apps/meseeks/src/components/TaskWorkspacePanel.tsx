import { CheckSquare, NotebookPen, PinOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@reactor/ui/button';
import { Checkbox } from '@reactor/ui/checkbox';
import { Textarea } from '@reactor/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@reactor/ui/tooltip';
import { useTaskWorkspace } from '~/hooks/useTaskWorkspace';
import { cn } from '@reactor/ui/lib/utils';

const NOTES_SAVE_DELAY_MS = 500;

export function TaskWorkspacePanel({ className }: { className?: string }) {
	const { pins, notes, setNotes, setPinDone, removePin } = useTaskWorkspace();
	const [localNotes, setLocalNotes] = useState(notes);
	const lastServerNotesRef = useRef(notes);

	useEffect(() => {
		if (notes === lastServerNotesRef.current) return;
		lastServerNotesRef.current = notes;
		setLocalNotes(notes);
	}, [notes]);

	useEffect(() => {
		if (localNotes === notes) return;

		const save = window.setTimeout(() => setNotes(localNotes), NOTES_SAVE_DELAY_MS);
		return () => window.clearTimeout(save);
	}, [localNotes, notes, setNotes]);

	return (
		<section className={cn('space-y-4 border-b pb-4', className)}>
			<div className="flex items-center justify-between gap-2">
				<div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Working Memory</div>
				{pins.length > 0 && (
					<div className="text-xs text-muted-foreground">
						{pins.filter((pin) => !pin.done).length}/{pins.length}
					</div>
				)}
			</div>

			<div className="space-y-2">
				<div className="flex items-center gap-2 text-sm font-medium">
					<CheckSquare className="size-4 text-muted-foreground" />
					<span>Anchors</span>
				</div>
				{pins.length > 0 ? (
					<div className="space-y-1">
						{pins.map((pin) => (
							<div key={pin.actionId} className="group/pin flex items-start gap-2 rounded-md px-1 py-1">
								<Checkbox
									checked={Boolean(pin.done)}
									onCheckedChange={(checked) => setPinDone(pin.actionId, checked === true)}
									className="mt-1"
									aria-label={`Toggle ${pin.label}`}
								/>
								<button
									type="button"
									onClick={() => jumpToAction(pin.actionId)}
									className={cn(
										'min-w-0 flex-1 text-left text-sm leading-snug hover:text-foreground',
										pin.done && 'text-muted-foreground line-through',
										!pin.done && 'text-foreground',
									)}
								>
									<span className="block truncate">{pin.label}</span>
									<span className="block truncate text-xs text-muted-foreground">{pin.skillKey}</span>
								</button>
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="size-7 opacity-0 transition-opacity group-hover/pin:opacity-100"
												onClick={() => removePin(pin.actionId)}
												aria-label={`Remove ${pin.label}`}
											>
												<PinOff className="size-4" />
											</Button>
										</TooltipTrigger>
										<TooltipContent className="px-2 py-1 text-xs">Remove anchor</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							</div>
						))}
					</div>
				) : (
					<div className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
						No anchors yet.
					</div>
				)}
			</div>

			<div className="space-y-2">
				<div className="flex items-center gap-2 text-sm font-medium">
					<NotebookPen className="size-4 text-muted-foreground" />
					<span>Notes</span>
				</div>
				<Textarea
					value={localNotes}
					onChange={(event) => setLocalNotes(event.target.value)}
					placeholder="Type here"
					className="min-h-28 resize-y rounded-lg bg-background/60 text-sm shadow-none"
				/>
			</div>
		</section>
	);
}

function jumpToAction(actionId: string) {
	const hash = `action-${actionId}`;
	const element = document.getElementById(hash);

	window.history.replaceState(null, '', `#${hash}`);
	if (!element) return;

	element.scrollIntoView({ behavior: 'smooth', block: 'center' });
	element.classList.add('action-anchor-pulse');
	window.setTimeout(() => element.classList.remove('action-anchor-pulse'), 1200);
}
