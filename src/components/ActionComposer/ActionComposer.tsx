import { Doc } from 'convex/_generated/dataModel';
import { useMemo, useRef } from 'react';
import { TooltipProvider } from '~/components/ui/tooltip';
import { useExpandingTextarea } from '~/hooks/useExpandingTextarea';
import { useKeyboardShortcut } from '~/hooks/useKeyboardShortcuts';
import { useRequestIteration, useSay, useStop } from '~/hooks/useTaskMutations';
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
	const { say, isSaying } = useSay();
	const { stop, isStopping } = useStop();
	const { requestIteration, isRequestingIteration } = useRequestIteration();
	const {
		textareaRef,
		value: message,
		isEmpty,
		onChange: handleMessageChange,
		setValue: setMessage,
	} = useExpandingTextarea({ singleLineHeight: 40 });

	const intelligenceSelectorRef = useRef<HTMLButtonElement>(null);
	const sayDraftRef = useRef('');

	const isComposing = !isEmpty;
	const isBlocked = useMemo(() => task.status === 'blocked' && isEmpty, [task.status, isEmpty]);
	const isActing = useMemo(() => task.status === 'acting' && isEmpty, [task.status, isEmpty]);
	const canRequestIteration = useMemo(() => isEmpty && !isBlocked && !isActing, [isEmpty, isBlocked, isActing]);

	const { recordingStatus, startRecording, stopRecording, cancelRecording } = useVoiceRecording({
		onTranscriptionComplete: setMessage,
	});

	const isAnyMutationPending = isSaying || isStopping || isRequestingIteration;

	const handleSubmit = () => {
		//
		if (!message.trim()) return;

		say({ message, taskId: task._id });
		setMessage('');
		onSubmit?.(message);
	};

	const handleRequestIteration = () => {
		requestIteration({ taskId: task._id });
	};

	// global focus shortcut (CMD+I)
	// focus is handled globally by the launcher; when focused, CMD+I rotates quick actions
	useKeyboardShortcut({
		targetRef: textareaRef,
		combo: { withCommand: true, key: 'i' },
		callback: () => {
			//
			if (isEmpty) {
				if (!sayDraftRef.current) return;
				setMessage(sayDraftRef.current);
				return;
			}

			sayDraftRef.current = message;
			setMessage('');
		},
	});

	// submit/request iteration shortcut (CMD+Enter) - only when textarea is focused
	useKeyboardShortcut({
		targetRef: textareaRef,
		combo: { withCommand: true, key: 'Enter' },
		callback: () => {
			if (recordingStatus === 'idle' && !isAnyMutationPending) {
				if (isEmpty && !isBlocked) {
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
			if (task.status === 'acting' && !isStopping) {
				stop({ taskId: task._id });
				e.preventDefault();
			}
		},
	});

	// intelligence selector shortcut (CMD+/)
	useKeyboardShortcut({
		global: true,
		combo: { withCommand: true, key: '/' },
		callback: () => intelligenceSelectorRef.current?.click(),
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
						handleRequestIteration={handleRequestIteration}
						isActing={isActing}
						isBlocked={isBlocked}
						isComposing={isComposing}
						canRequestIteration={canRequestIteration}
						intelligenceSelectorRef={intelligenceSelectorRef}
						handleStop={() => stop({ taskId: task._id })}
					/>
				)}
			</div>
		</TooltipProvider>
	);
}
