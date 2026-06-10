import { ArrowUp, Hourglass, Mic, Sparkles, Square } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SkillsLink } from '~/components/SkillsLink';
import { ActionButton } from '@reactor/ui/action-button';
import { KeyboardShortcutIndicator } from './KeyboardShortcutIndicator';

interface IdleStateProps {
	//
	textareaRef: React.RefObject<HTMLTextAreaElement | null>;
	message: string;
	handleMessageChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
	isEmpty: boolean;
	hasQueuedSkills: boolean;
	startRecording: () => void;
	handleAct: () => void;
	handleEnqueue: () => void;
	isBlocked: boolean;
	isActing: boolean;
	isComposing: boolean;
	canRequestIteration: boolean;
	handleStop: () => void;
	leftControl: React.ReactNode;
}

export function IdleState({
	textareaRef,
	message,
	handleMessageChange,
	isEmpty,
	hasQueuedSkills,
	startRecording,
	handleAct,
	handleEnqueue,
	isBlocked,
	isActing,
	isComposing,
	canRequestIteration,
	handleStop,
	leftControl,
}: IdleStateProps) {
	//
	return (
		<>
			<div className="flex flex-grow items-center justify-center px-2">
				<textarea
					ref={textareaRef}
					value={message}
					onChange={handleMessageChange}
					placeholder="What's next?"
					className="text-primary py-2 w-full resize-none border-none bg-transparent shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
				/>
			</div>

			<div className="flex items-center justify-between gap-2 pt-2">
				<div className="flex items-center gap-2">
					{leftControl}
					<SkillsLink />
				</div>

				<div className="flex items-center gap-2">
					{/* Keyboard shortcut indicators */}
					{isActing && <KeyboardShortcutIndicator modifier="^" keySymbol="C" text="to interrupt" />}
					{isBlocked && <span className="hidden text-xs text-muted-foreground md:flex">needs input</span>}
					{!isEmpty && <KeyboardShortcutIndicator modifier="⌥" keySymbol="⏎" text="to enqueue" />}
					{isComposing && <KeyboardShortcutIndicator modifier="⌘" keySymbol="⏎" text="to act" />}
					{canRequestIteration && <KeyboardShortcutIndicator modifier="⌘" keySymbol="⏎" text="to iterate" />}

					{/* Action buttons */}
					<ActionButton
						icon={<Mic className="size-5" />}
						onClick={startRecording}
						tooltip="Transcribe voice"
						variant="secondary"
					/>
					<PrimaryActionButton
						canRequestIteration={canRequestIteration}
						isActing={isActing}
						isEmpty={isEmpty}
						hasQueuedSkills={hasQueuedSkills}
						handleAct={handleAct}
						handleStop={handleStop}
						handleEnqueue={handleEnqueue}
					/>
				</div>
			</div>
		</>
	);
}

function PrimaryActionButton(props: {
	canRequestIteration: boolean;
	isActing: boolean;
	isEmpty: boolean;
	hasQueuedSkills: boolean;
	handleAct: () => void;
	handleStop: () => void;
	handleEnqueue: () => void;
}) {
	//
	const {
		canRequestIteration, //
		isActing,
		isEmpty,
		hasQueuedSkills,
		handleAct,
		handleStop,
		handleEnqueue,
	} = props;

	const [isOptionHeld, setIsOptionHeld] = useState(false);

	useEffect(() => {
		//
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.altKey) setIsOptionHeld(true);
		};
		const handleKeyUp = (e: KeyboardEvent) => {
			if (!e.altKey) setIsOptionHeld(false);
		};

		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
		};
	}, []);

	if (canRequestIteration) {
		return <ActionButton icon={<Sparkles className="size-5" />} onClick={handleAct} tooltip="Seek (⌘+⏎)" />;
	}

	if (isActing) {
		return <ActionButton icon={<Square className="size-5" />} onClick={handleStop} tooltip="Interrupt (CTRL+C)" />;
	}

	// enqueue
	if (isOptionHeld && !isEmpty) {
		return (
			<ActionButton
				icon={<Hourglass className="size-5" />}
				onClick={handleEnqueue}
				disabled={isEmpty}
				tooltip="Enqueue (⌥+⏎)"
			/>
		);
	}

	return (
		<ActionButton
			icon={<ArrowUp className="size-5" />}
			onClick={handleAct}
			disabled={isEmpty && !hasQueuedSkills}
			tooltip="Act (⌘+⏎)"
		/>
	);
}
