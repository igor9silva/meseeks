import type { Doc } from 'convex/_generated/dataModel';
import { useEffect, useRef } from 'react';
import { TooltipProvider } from '@reactor/ui/tooltip';
import { useComposer } from '~/hooks/useComposer';
import { useExpandingTextarea } from '@reactor/ui/hooks/useExpandingTextarea';
import { useKeyboardShortcut } from '@reactor/ui/hooks/useKeyboardShortcuts';
import { useStop } from '~/hooks/useTaskMutations';
import { useVoiceRecording } from '~/hooks/useVoiceRecording';
import { cn } from '@reactor/ui/lib/utils';
import { IdleState } from './IdleState';
import { RecordingState } from './RecordingState';
import { TranscribingState } from './TranscribingState';
import { StripContainer } from './strips/StripContainer';

interface ActionComposerProps {
	//
	task: Doc<'tasks'>;
	onSubmit?: (message: string) => void;
	className?: string;
}

export function ActionComposer({ task, onSubmit, className }: ActionComposerProps) {
	//
	const {
		queue, //
		message,
		enqueue,
		setMessage,
		submit,
	} = useComposer();

	const { stop, isStopping } = useStop();

	const {
		textareaRef,
		value: localMessage,
		isEmpty: isLocalEmpty,
		onChange: handleLocalMessageChange,
		setValue: setLocalMessage,
	} = useExpandingTextarea({ singleLineHeight: 40 });

	const intelligenceSelectorRef = useRef<HTMLButtonElement | null>(null);

	// sync URL message to local textarea on mount and when URL changes externally
	useEffect(() => {
		if (message !== localMessage) {
			setLocalMessage(message);
		}
	}, [message, localMessage, setLocalMessage]);

	// handle message change - update both local and URL state
	const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		//
		handleLocalMessageChange(e);
		setMessage(e.target.value);
	};

	// sync local message back to URL when voice transcription completes
	const handleTranscriptionComplete = (transcribedText: string) => {
		//
		setLocalMessage(transcribedText);
		setMessage(transcribedText);
	};

	const { recordingStatus, startRecording, stopRecording, cancelRecording } = useVoiceRecording({
		onTranscriptionComplete: handleTranscriptionComplete,
	});

	const isRecordingOrTranscribing = recordingStatus !== 'idle';

	// computed states for UI
	const isComposing = !isLocalEmpty || queue.length > 0;
	const isBlocked = task.status === 'blocked' && isLocalEmpty;
	const isTaskActing = task.status === 'acting' && isLocalEmpty;
	const canRequestIteration = isLocalEmpty && !isBlocked && !isTaskActing && queue.length === 0;

	const handleAct = async () => {
		//
		await submit(task);

		if (!isLocalEmpty) {
			onSubmit?.(localMessage);
		}
	};

	const handleEnqueueMessage = () => {
		//
		const trimmed = localMessage.trim();
		if (!trimmed) return;

		// enqueue with clearMessage option to avoid race condition
		const didEnqueue = enqueue(
			{
				skillKey: 'say',
				args: { message: trimmed },
				source: 'input',
			},
			{ clearMessage: true },
		);

		// only clear local state if enqueue succeeded
		if (didEnqueue) {
			setLocalMessage('');
		}
	};

	const handleStop = () => {
		//
		stop({ taskId: task._id });
	};

	// global focus shortcut (⌘+I)
	useKeyboardShortcut({
		global: true,
		combo: { withCommand: true, key: 'i' },
		callback: () => {
			textareaRef.current?.focus();
			const length = textareaRef.current?.value.length || 0;
			textareaRef.current?.setSelectionRange(length, length);
		},
	});

	// submit/request iteration shortcut (⌘+Enter)
	useKeyboardShortcut({
		targetRef: textareaRef,
		combo: { withCommand: true, key: 'Enter' },
		callback: () => {
			if (recordingStatus === 'idle' && !isStopping) {
				handleAct();
			}
		},
	});

	// enqueue message shortcut (⌥+Enter)
	useKeyboardShortcut({
		targetRef: textareaRef,
		combo: { withAlt: true, key: 'Enter' },
		callback: () => {
			if (recordingStatus === 'idle') {
				handleEnqueueMessage();
			}
		},
	});

	// stop acting shortcut (CTRL+C)
	useKeyboardShortcut({
		global: true,
		combo: { withCtrl: true, key: 'c' },
		skipPreventDefault: true,
		callback: (e) => {
			if (task.status === 'acting' && !isStopping) {
				handleStop();
				e.preventDefault();
			}
		},
	});

	// intelligence selector shortcut (⌘+/)
	useKeyboardShortcut({
		global: true,
		combo: { withCommand: true, key: '/' },
		callback: () => intelligenceSelectorRef.current?.click(),
	});

	return (
		<TooltipProvider>
			<div
				className={cn(
					'bg-sidebar rounded-3xl border p-2 mx-2 mb-2 shadow-xs flex flex-col',
					className,
					isRecordingOrTranscribing && 'flex-row',
				)}
			>
				{/* strips - only visible when idle */}
				{!isRecordingOrTranscribing && (
					<div className="border-b border-border/50 -mx-2 -mt-2 rounded-t-3xl overflow-hidden">
						<StripContainer task={task} />
					</div>
				)}

				{/* recording state */}
				{recordingStatus === 'recording' && (
					<RecordingState stopRecording={stopRecording} cancelRecording={cancelRecording} />
				)}

				{/* transcribing state */}
				{recordingStatus === 'transcribing' && <TranscribingState cancelRecording={cancelRecording} />}

				{/* idle state - input and action bar */}
				{!isRecordingOrTranscribing && (
					<IdleState
						task={task}
						textareaRef={textareaRef}
						message={localMessage}
						handleMessageChange={handleMessageChange}
						isEmpty={isLocalEmpty}
						hasQueuedSkills={queue.length > 0}
						startRecording={startRecording}
						handleAct={handleAct}
						handleEnqueue={handleEnqueueMessage}
						isActing={isTaskActing}
						isBlocked={isBlocked}
						isComposing={isComposing}
						canRequestIteration={canRequestIteration}
						intelligenceSelectorRef={intelligenceSelectorRef}
						handleStop={handleStop}
					/>
				)}
			</div>
		</TooltipProvider>
	);
}
