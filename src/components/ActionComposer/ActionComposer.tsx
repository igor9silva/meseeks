import { Doc } from 'convex/_generated/dataModel';
import { useMemo } from 'react';
import { TooltipProvider } from '~/components/ui/tooltip';
import { useExpandingTextarea } from '~/hooks/useExpandingTextarea';
import { useKeyboardShortcut } from '~/hooks/useKeyboardShortcuts';
import { useTaskMutations } from '~/hooks/useTaskMutations';
import { useVoiceRecording } from '~/hooks/useVoiceRecording';
import { cn } from '~/lib/utils';
import { IdleState } from './IdleState';
import { RecordingState } from './RecordingState';
import { TranscribingState } from './TranscribingState';

export function ActionComposer({
	task,
	onSubmit,
	className,
}: {
	task: Doc<'tasks'>;
	onSubmit?: (message: string) => void;
	className?: string;
}) {
	const { say, stop, requestIteration, approveBlockingAction } = useTaskMutations();
	const {
		textareaRef,
		value: message,
		isEmpty,
		onChange: handleMessageChange,
		setValue: setMessage,
	} = useExpandingTextarea();

	const isBlocked = useMemo(() => task.status === 'blocked' && isEmpty, [task.status, isEmpty]);
	const isActing = useMemo(() => task.status === 'acting' && isEmpty, [task.status, isEmpty]);
	const isComposing = !isEmpty;

	const { recordingStatus, startRecording, stopRecording, cancelRecording } = useVoiceRecording({
		onTranscriptionComplete: setMessage,
	});

	const handleSubmit = () => {
		//
		if (!message.trim()) return;

		say({ message, taskId: task._id });
		setMessage('');
		onSubmit?.(message);
	};

	// global focus shortcut (CMD+I)
	useKeyboardShortcut({
		global: true,
		combo: { withCommand: true, key: 'i' },
		callback: () => textareaRef.current?.focus(),
	});

	// submit/approve shortcut (CMD+Enter)
	useKeyboardShortcut({
		global: true,
		combo: { withCommand: true, key: 'Enter' },
		callback: () => {
			if (isBlocked) {
				approveBlockingAction({ taskId: task._id });
			} else if (recordingStatus === 'idle') {
				if (isEmpty) {
					requestIteration({ taskId: task._id });
				} else {
					handleSubmit();
				}
			}
		},
	});

	// stop acting shortcut (CMD+Backspace)
	useKeyboardShortcut({
		global: true,
		combo: { withCommand: true, key: 'Backspace' },
		skipPreventDefault: true,
		callback: (e) => {
			if (task.status === 'acting') {
				stop({ taskId: task._id });
				e.preventDefault();
			}
		},
	});

	return (
		<TooltipProvider>
			<div
				className={cn(
					'bg-sidebar rounded-3xl border p-2 shadow-xs flex flex-col',
					className,
					recordingStatus !== 'idle' && 'flex-row',
				)}
			>
				{'recording' === recordingStatus && (
					<RecordingState stopRecording={stopRecording} cancelRecording={cancelRecording} />
				)}

				{'transcribing' === recordingStatus && ( //
					<TranscribingState cancelRecording={cancelRecording} />
				)}

				{'idle' === recordingStatus && (
					<IdleState
						task={task}
						textareaRef={textareaRef}
						message={message}
						handleMessageChange={handleMessageChange}
						isEmpty={isEmpty}
						startRecording={startRecording}
						handleSubmit={handleSubmit}
						isActing={isActing}
						isBlocked={isBlocked}
						isComposing={isComposing}
					/>
				)}
			</div>
		</TooltipProvider>
	);
}
