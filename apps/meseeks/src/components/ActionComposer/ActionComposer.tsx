import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import type { Doc } from 'convex/_generated/dataModel';
import { api } from 'convex/_generated/api';
import { ChevronDown, CircleOff, MessageCircle, Radar } from 'lucide-react';
import { useEffect, useState } from 'react';
import { TooltipProvider } from '@pro/ui/tooltip';
import { Button } from '@pro/ui/button';
import { useComposer } from '~/hooks/useComposer';
import { useExpandingTextarea } from '@pro/ui/hooks/useExpandingTextarea';
import { useKeyboardShortcut } from '@pro/ui/hooks/useKeyboardShortcuts';
import { useStop } from '~/hooks/useFileMutations';
import { useVoiceRecording } from '~/hooks/useVoiceRecording';
import { cn } from '@pro/ui/lib/utils';
import type { FileView } from '~/hooks/query/useFile';
import { IntelligencePicker, intelligencePickerOptionsFromData } from '~/components/IntelligencePicker';
import { IdleState } from './IdleState';
import { RecordingState } from './RecordingState';
import { TranscribingState } from './TranscribingState';
import { StripContainer } from './strips/StripContainer';

const noLoopOption = {
	name: 'No loop',
	visual: {
		icon: 'circle-off',
		color: 'zinc',
		tint: 'zinc',
	},
};

interface ActionComposerProps {
	//
	file: FileView;
	onSubmit?: (message: string) => void;
	className?: string;
}

export function ActionComposer({ file, onSubmit, className }: ActionComposerProps) {
	//
	const {
		queue, //
		message,
		enqueue,
		setMessage,
		submit,
	} = useComposer();

	const { stop, isStopping } = useStop();
	const loopsQuery = convexQuery(api.loops.findAll, {});
	const intelligencesQuery = convexQuery(api.loops.intelligenceOptions, {});
	const { data: loopsData } = useSuspenseQuery(loopsQuery);
	const { data: intelligences } = useSuspenseQuery(intelligencesQuery);
	const intelligencePickerOptions = intelligencePickerOptionsFromData(intelligences);
	const seekLoop = loopsData.loops.find((loop) => loop.key === '@pro/Seek');
	const initialLoop = seekLoop ?? loopsData.loops[0];
	const [selectedLoop, setSelectedLoop] = useState<string | null>(initialLoop?.key ?? null);
	const [isLoopPanelOpen, setIsLoopPanelOpen] = useState(false);
	const [selectedIntelligence, setSelectedIntelligence] = useState(defaultIntelligenceForLoop(initialLoop));

	const selectedLoopRecord = loopsData.loops.find((loop) => loop.key === selectedLoop);
	const selectedVisual = selectedLoopRecord?.visual ?? noLoopOption.visual;
	const selectedLoopName = selectedLoopRecord?.name ?? noLoopOption.name;

	const {
		textareaRef,
		value: localMessage,
		isEmpty: isLocalEmpty,
		onChange: handleLocalMessageChange,
		setValue: setLocalMessage,
	} = useExpandingTextarea({ singleLineHeight: 40 });

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
	const isBlocked = file.status === 'blocked' && isLocalEmpty;
	const isFileActing = file.status === 'acting' && isLocalEmpty;
	const canRequestIteration = isLocalEmpty && !isBlocked && !isFileActing && queue.length === 0;

	const handleAct = async () => {
		//
		await submit(file, {
			loopKey: selectedLoop,
			intelligence: selectedIntelligence,
		});

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
		stop({ fileId: file._id });
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
			if (file.status === 'acting' && !isStopping) {
				handleStop();
				e.preventDefault();
			}
		},
	});

	// intelligence picker shortcut (⌘+/)
	useKeyboardShortcut({
		global: true,
		combo: { withCommand: true, key: '/' },
		callback: () => setIsLoopPanelOpen((value) => !value),
	});

	const handleSelectNoLoop = () => {
		//
		setSelectedLoop(null);
		setSelectedIntelligence('Cheap');
	};

	const handleSelectLoop = (loop: Doc<'loops'>) => {
		//
		setSelectedLoop(loop.key);
		setSelectedIntelligence(defaultIntelligenceForLoop(loop));
	};

	const handleSelectIntelligence = (key: string) => {
		//
		setSelectedIntelligence(key);
		setIsLoopPanelOpen(false);
	};

	return (
		<TooltipProvider>
			<div
				className={cn(
					'bg-sidebar rounded-3xl border p-2 mx-2 mb-2 shadow-xs flex flex-col',
					tintFor(selectedVisual.tint),
					className,
					isRecordingOrTranscribing && 'flex-row',
				)}
			>
				{/* strips - only visible when idle */}
				{!isRecordingOrTranscribing && (
					<div className="border-b border-border/50 -mx-2 -mt-2 rounded-t-3xl overflow-hidden">
						<StripContainer file={file} />
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
					<>
						{isLoopPanelOpen && (
							<div className="mb-3 grid gap-3 border-b border-border/50 px-2 pt-4 pb-4 md:grid-cols-2">
								<div className="space-y-2">
									<div className="text-xs font-medium uppercase text-muted-foreground">Loop</div>
									<div className="flex flex-wrap gap-2">
										<Button
											type="button"
											variant={selectedLoop === null ? 'default' : 'secondary'}
											size="sm"
											className={
												selectedLoop === null ? colorFor(noLoopOption.visual.color) : undefined
											}
											onClick={handleSelectNoLoop}
										>
											{iconFor(noLoopOption.visual.icon)}
											{noLoopOption.name}
										</Button>
										{loopsData.loops.map((loop) => (
											<Button
												type="button"
												key={loop._id}
												variant={selectedLoop === loop.key ? 'default' : 'secondary'}
												size="sm"
												className={
													selectedLoop === loop.key ? colorFor(loop.visual.color) : undefined
												}
												onClick={() => handleSelectLoop(loop)}
											>
												{iconFor(loop.visual.icon)}
												{loop.name}
											</Button>
										))}
									</div>
								</div>
								<div className="space-y-2">
									<div className="text-xs font-medium uppercase text-muted-foreground">
										Intelligence
									</div>
									<IntelligencePicker
										value={selectedIntelligence}
										onChange={handleSelectIntelligence}
										options={intelligencePickerOptions.options}
										recommendedKeys={intelligencePickerOptions.recommendedKeys}
										popoverSide="top"
									/>
								</div>
							</div>
						)}

						<IdleState
							textareaRef={textareaRef}
							message={localMessage}
							handleMessageChange={handleMessageChange}
							isEmpty={isLocalEmpty}
							hasQueuedSkills={queue.length > 0}
							startRecording={startRecording}
							handleAct={handleAct}
							handleEnqueue={handleEnqueueMessage}
							isActing={isFileActing}
							isBlocked={isBlocked}
							isComposing={isComposing}
							canRequestIteration={canRequestIteration}
							handleStop={handleStop}
							leftControl={
								<LoopButton
									label={selectedLoopName}
									icon={iconFor(selectedVisual.icon)}
									color={selectedVisual.color}
									isOpen={isLoopPanelOpen}
									onClick={() => setIsLoopPanelOpen((value) => !value)}
								/>
							}
						/>
					</>
				)}
			</div>
		</TooltipProvider>
	);
}

function LoopButton({
	label,
	icon,
	color,
	isOpen,
	onClick,
}: {
	label: string;
	icon: React.ReactNode;
	color: string;
	isOpen: boolean;
	onClick: () => void;
}) {
	return (
		<Button type="button" variant="secondary" onClick={onClick} className={cn('shrink-0', colorFor(color))}>
			{icon}
			{label}
			<ChevronDown className={cn('size-3 transition-transform', isOpen && 'rotate-180')} />
		</Button>
	);
}

function defaultIntelligenceForLoop(loop: Doc<'loops'> | undefined) {
	//
	return loop?.defaultIntelligenceKey ?? 'Cheap';
}

function tintFor(tint: string) {
	//
	if (tint === 'emerald') return 'border-emerald-500/40 bg-emerald-500/5';
	if (tint === 'sky') return 'border-sky-500/40 bg-sky-500/5';
	if (tint === 'violet') return 'border-violet-500/40 bg-violet-500/5';
	return 'border-zinc-500/30 bg-zinc-500/5';
}

function colorFor(color: string) {
	//
	if (color === 'emerald') {
		return '!border-emerald-500/60 !bg-emerald-600 !text-white hover:!bg-emerald-700 dark:!bg-emerald-400 dark:!text-emerald-950 dark:hover:!bg-emerald-300';
	}
	if (color === 'sky') {
		return '!border-sky-500/60 !bg-sky-600 !text-white hover:!bg-sky-700 dark:!bg-sky-400 dark:!text-sky-950 dark:hover:!bg-sky-300';
	}
	if (color === 'violet') {
		return '!border-violet-500/60 !bg-violet-600 !text-white hover:!bg-violet-700 dark:!bg-violet-400 dark:!text-violet-950 dark:hover:!bg-violet-300';
	}
	return '!border-zinc-500/60 !bg-zinc-900 !text-zinc-50 hover:!bg-zinc-800 dark:!bg-zinc-100 dark:!text-zinc-950 dark:hover:!bg-zinc-200';
}

function iconFor(icon: string) {
	//
	if (icon === 'message-circle') return <MessageCircle className="size-4" />;
	if (icon === 'telescope' || icon === 'compass' || icon === 'radar') return <Radar className="size-4" />;
	return <CircleOff className="size-4" />;
}
