import type { Doc } from 'convex/_generated/dataModel';
import { intelligenceKeys } from 'schemas/intelligenceSchema';
import { ArrowUp, Hourglass, Mic, Sparkles, Square } from 'lucide-react';
import { useEffect, useState } from 'react';
import { z } from 'zod/v3';
import { IntelligenceSelector } from '~/components/IntelligenceSelector';
import { SkillsLink } from '~/components/SkillsLink';
import { ActionButton } from '~/components/ui/action-button';
import { useSetPreferredIntelligence } from '~/hooks/useTaskMutations';
import { KeyboardShortcutIndicator } from './KeyboardShortcutIndicator';

interface IdleStateProps {
	//
	task: Doc<'tasks'>;
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
	intelligenceSelectorRef: React.RefObject<HTMLButtonElement | null>;
	handleStop: () => void;
}

export function IdleState({
	task,
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
	intelligenceSelectorRef,
	handleStop,
}: IdleStateProps) {
	//
	const { setPreferredIntelligence, isSettingPreferredIntelligence } = useSetPreferredIntelligence();
	const handleIntelligenceChange = (key: z.infer<typeof intelligenceKeys>) => {
		if (isSettingPreferredIntelligence) return;
		setPreferredIntelligence({ taskId: task._id, preferredIntelligence: key });
	};

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
					<IntelligenceSelector
						value={task.preferredIntelligence}
						onChange={handleIntelligenceChange}
						ref={intelligenceSelectorRef}
					/>
					<SkillsLink />
				</div>

				<div className="flex items-center gap-2">
					{/* Keyboard shortcut indicators */}
					{isActing && <KeyboardShortcutIndicator modifier="^" keySymbol="C" text="to interrupt" />}
					{isBlocked && <KeyboardShortcutIndicator modifier="⌥" keySymbol="⏎" text="to authorize" />}
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
