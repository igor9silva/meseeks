import { Doc } from 'convex/_generated/dataModel';
import { modelsSchema } from 'convex/schemas/skillSchema';
import { ArrowUp, Mic } from 'lucide-react';
import { z } from 'zod';
import { IntelligenceSelector } from '~/components/IntelligenceSelector';
import { SkillsLink } from '~/components/SkillsLink';
import { ActionButton } from '~/components/ui/action-button';
import { useTaskMutations } from '~/hooks/useTaskMutations';
import { KeyboardShortcutIndicator } from './KeyboardShortcutIndicator';

interface IdleStateProps {
	//
	task: Doc<'tasks'>;
	textareaRef: React.RefObject<HTMLTextAreaElement>;
	message: string;
	handleMessageChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
	isEmpty: boolean;
	startRecording: () => void;
	handleSubmit: () => void;
	isBlocked: boolean;
	isActing: boolean;
	isComposing: boolean;
}

export function IdleState({
	task,
	textareaRef,
	message,
	handleMessageChange,
	isEmpty,
	startRecording,
	handleSubmit,
	isBlocked,
	isActing,
	isComposing,
}: IdleStateProps) {
	//
	const { setPreferredIntelligence } = useTaskMutations();
	const handleIntelligenceChange = (key: z.infer<typeof modelsSchema>) => {
		setPreferredIntelligence({ taskId: task._id, preferredIntelligence: key });
	};

	return (
		<>
			<div className="flex flex-grow items-center justify-center px-3">
				<textarea
					ref={textareaRef}
					value={message}
					onChange={handleMessageChange}
					placeholder="What's next?"
					className="text-primary min-h-14 py-2 w-full resize-none border-none bg-transparent shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
				/>
			</div>

			<div className="flex items-center justify-between gap-2 px-3 pt-2">
				<div className="flex items-center gap-2 flex-shrink-0">
					<IntelligenceSelector value={task.preferredIntelligence} onChange={handleIntelligenceChange} />
					<SkillsLink />
				</div>

				<div className="flex items-center gap-2">
					{/* Keyboard shortcut indicators */}
					{isActing && <KeyboardShortcutIndicator keySymbol="⌫" text="to stop" />}
					{isBlocked && <KeyboardShortcutIndicator keySymbol="⏎" text="to authorize" />}
					{isComposing && <KeyboardShortcutIndicator keySymbol="⏎" text="to act" />}

					{/* Action buttons */}
					<ActionButton
						icon={<Mic className="size-5" />}
						onClick={startRecording}
						tooltip="Transcribe voice"
						variant="secondary"
						className="hidden" // TODO: temporary hidden
					/>
					<ActionButton
						icon={<ArrowUp className="size-5" />}
						onClick={handleSubmit}
						disabled={isEmpty}
						tooltip="Act"
					/>
				</div>
			</div>
		</>
	);
}
