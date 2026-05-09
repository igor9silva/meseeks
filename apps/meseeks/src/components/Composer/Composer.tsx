import { ArrowUp, Hourglass, Mic, Sparkles, Square, X } from 'lucide-react';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { ActionButton } from '@reactor/ui/action-button';
import { useExpandingTextarea } from '@reactor/ui/hooks/useExpandingTextarea';
import { useKeyboardShortcut } from '@reactor/ui/hooks/useKeyboardShortcuts';
import { cn } from '@reactor/ui/lib/utils';
import { TextShimmer } from '@reactor/ui/text-shimmer';
import { TooltipProvider } from '@reactor/ui/tooltip';
import { useVoiceRecording } from '~/hooks/useVoiceRecording';
import { getVoiceTextAnchor, insertVoiceText, type VoiceTextAnchor } from '~/lib/voiceText';

type TranscriptionMode = 'idle' | 'connecting' | 'realtime' | 'fallback';

export type ComposerHandle = {
	focusEnd: () => void;
};

export type ComposerProps = {
	value: string;
	onValueChange: (value: string) => void;
	onSubmit: () => void | Promise<void>;
	onEnqueue?: () => void;
	onStop?: () => void;
	placeholder?: string;
	promptContext?: string;
	className?: string;
	textareaClassName?: string;
	strips?: ReactNode;
	leadingControls?: ReactNode;
	secondaryControls?: ReactNode;
	isActing?: boolean;
	isBlocked?: boolean;
	isComposing?: boolean;
	canRequestIteration?: boolean;
	hasQueuedItems?: boolean;
	isStopping?: boolean;
	submitDisabled?: boolean;
	showShortcutHints?: boolean;
	submitTooltip?: string;
	iterationTooltip?: string;
	stopTooltip?: string;
	enqueueTooltip?: string;
	submitShortcutScope?: 'target' | 'global' | 'none';
};

export const Composer = forwardRef<ComposerHandle, ComposerProps>(function Composer(
	{
		value,
		onValueChange,
		onSubmit,
		onEnqueue,
		onStop,
		placeholder = "What's next?",
		promptContext,
		className,
		textareaClassName,
		strips,
		leadingControls,
		secondaryControls,
		isActing = false,
		isBlocked = false,
		isComposing = false,
		canRequestIteration = false,
		hasQueuedItems = false,
		isStopping = false,
		submitDisabled = false,
		showShortcutHints = true,
		submitTooltip = 'Act (⌘+⏎)',
		iterationTooltip = 'Seek (⌘+⏎)',
		stopTooltip = 'Interrupt (CTRL+C)',
		enqueueTooltip = 'Enqueue (⌥+⏎)',
		submitShortcutScope = 'target',
	},
	ref,
) {
	//
	const {
		textareaRef,
		value: localValue,
		isEmpty,
		onChange: handleLocalValueChange,
		setValue: setLocalValue,
	} = useExpandingTextarea({ initialValue: value, singleLineHeight: 40 });

	const voiceAnchorRef = useRef<VoiceTextAnchor | null>(null);
	const submitBlocked = submitDisabled || (!canRequestIteration && isEmpty && !hasQueuedItems);

	useEffect(() => {
		if (value !== localValue) {
			setLocalValue(value);
		}
	}, [value, localValue, setLocalValue]);

	const focusEnd = useCallback(() => {
		//
		textareaRef.current?.focus();
		const length = textareaRef.current?.value.length ?? 0;
		textareaRef.current?.setSelectionRange(length, length);
	}, [textareaRef]);

	useImperativeHandle(ref, () => ({ focusEnd }), [focusEnd]);

	const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
		//
		handleLocalValueChange(event);
		onValueChange(event.target.value);
	};

	const applyVoiceTranscript = (transcribedText: string) => {
		//
		const anchor = voiceAnchorRef.current ?? getVoiceTextAnchor(textareaRef.current, localValue);
		const nextValue = insertVoiceText(anchor, transcribedText);
		setLocalValue(nextValue);
		onValueChange(nextValue);
	};

	const handleTranscriptionCancel = () => {
		//
		const anchor = voiceAnchorRef.current;
		if (!anchor) return;

		setLocalValue(anchor.value);
		onValueChange(anchor.value);
		voiceAnchorRef.current = null;
	};

	const handleTranscriptionComplete = (transcribedText: string) => {
		//
		applyVoiceTranscript(transcribedText);
		voiceAnchorRef.current = null;
	};

	const {
		recordingStatus,
		transcriptionMode,
		liveTranscript,
		inputLevel,
		elapsedMs,
		startRecording,
		stopRecording,
		cancelRecording,
	} = useVoiceRecording({
		...(promptContext ? { promptContext } : {}),
		onTranscriptionDelta: applyVoiceTranscript,
		onTranscriptionComplete: handleTranscriptionComplete,
		onTranscriptionCancel: handleTranscriptionCancel,
	});

	const isRecordingOrTranscribing = recordingStatus !== 'idle';

	const handleStartRecording = async () => {
		//
		voiceAnchorRef.current = getVoiceTextAnchor(textareaRef.current, localValue);
		await startRecording();
	};

	useKeyboardShortcut({
		targetRef: textareaRef,
		global: submitShortcutScope === 'global',
		combo: { withCommand: true, key: 'Enter' },
		callback: () => {
			if (submitShortcutScope === 'none') return;
			if (recordingStatus === 'idle' && !isStopping && !submitBlocked) {
				void onSubmit();
			}
		},
	});

	useKeyboardShortcut({
		targetRef: textareaRef,
		combo: { withAlt: true, key: 'Enter' },
		callback: () => {
			if (recordingStatus === 'idle' && onEnqueue && !isEmpty) {
				onEnqueue();
			}
		},
	});

	return (
		<TooltipProvider>
			<div
				className={cn(
					'bg-sidebar mx-2 mb-2 flex flex-col rounded-2xl border p-2 shadow-xs',
					isRecordingOrTranscribing && 'flex-row',
					className,
				)}
			>
				{strips && !isRecordingOrTranscribing && (
					<div className="-mx-2 -mt-2 overflow-hidden rounded-t-2xl border-b border-border/50">{strips}</div>
				)}

				{recordingStatus === 'recording' && (
					<RecordingPanel
						transcript={liveTranscript}
						transcriptionMode={transcriptionMode}
						inputLevel={inputLevel}
						elapsedMs={elapsedMs}
						stopRecording={stopRecording}
						cancelRecording={cancelRecording}
					/>
				)}

				{recordingStatus === 'transcribing' && (
					<TranscribingPanel
						transcript={liveTranscript}
						transcriptionMode={transcriptionMode}
						cancelRecording={cancelRecording}
					/>
				)}

				{!isRecordingOrTranscribing && (
					<>
						<div className="flex flex-grow items-center justify-center px-2">
							<textarea
								ref={textareaRef}
								value={localValue}
								onChange={handleChange}
								placeholder={placeholder}
								className={cn(
									'text-primary w-full resize-none border-none bg-transparent py-2 shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0',
									textareaClassName,
								)}
							/>
						</div>

						<div className="flex flex-col gap-2 pt-2 md:flex-row md:items-center md:justify-between">
							<div className="flex min-w-0 flex-1 items-center gap-2">{leadingControls}</div>

							<div className="flex shrink-0 items-center justify-between gap-2 md:justify-end">
								{secondaryControls && (
									<div className="flex min-w-0 items-center gap-2">{secondaryControls}</div>
								)}

								<div className="flex items-center gap-2">
									{showShortcutHints && (
										<ShortcutHints
											isActing={isActing}
											isBlocked={isBlocked}
											isComposing={isComposing}
											isEmpty={isEmpty}
											canRequestIteration={canRequestIteration}
											canEnqueue={Boolean(onEnqueue)}
										/>
									)}

									<ActionButton
										icon={<Mic className="size-5" />}
										onClick={handleStartRecording}
										tooltip="Transcribe voice"
										variant="secondary"
									/>

									<PrimaryActionButton
										canRequestIteration={canRequestIteration}
										isActing={isActing}
										isEmpty={isEmpty}
										hasQueuedItems={hasQueuedItems}
										isSubmitDisabled={submitBlocked}
										onSubmit={onSubmit}
										onStop={onStop}
										onEnqueue={onEnqueue}
										submitTooltip={submitTooltip}
										iterationTooltip={iterationTooltip}
										stopTooltip={stopTooltip}
										enqueueTooltip={enqueueTooltip}
									/>
								</div>
							</div>
						</div>
					</>
				)}
			</div>
		</TooltipProvider>
	);
});

function ShortcutHints({
	isActing,
	isBlocked,
	isComposing,
	isEmpty,
	canRequestIteration,
	canEnqueue,
}: {
	isActing: boolean;
	isBlocked: boolean;
	isComposing: boolean;
	isEmpty: boolean;
	canRequestIteration: boolean;
	canEnqueue: boolean;
}) {
	//
	return (
		<>
			{isActing && <ShortcutHint modifier="^" keySymbol="C" text="to interrupt" />}
			{isBlocked && <ShortcutHint modifier="⌥" keySymbol="⏎" text="to authorize" />}
			{canEnqueue && !isEmpty && <ShortcutHint modifier="⌥" keySymbol="⏎" text="to enqueue" />}
			{isComposing && <ShortcutHint modifier="⌘" keySymbol="⏎" text="to act" />}
			{canRequestIteration && <ShortcutHint modifier="⌘" keySymbol="⏎" text="to iterate" />}
		</>
	);
}

function ShortcutHint({ modifier, keySymbol, text }: { modifier: string; keySymbol: string; text: string }) {
	//
	return (
		<div className="text-muted-foreground flex items-center gap-1 text-xs">
			<kbd className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">{modifier}</kbd>
			<kbd className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">{keySymbol}</kbd>
			<span>{text}</span>
		</div>
	);
}

function PrimaryActionButton({
	canRequestIteration,
	isActing,
	isEmpty,
	hasQueuedItems,
	isSubmitDisabled,
	onSubmit,
	onStop,
	onEnqueue,
	submitTooltip,
	iterationTooltip,
	stopTooltip,
	enqueueTooltip,
}: {
	canRequestIteration: boolean;
	isActing: boolean;
	isEmpty: boolean;
	hasQueuedItems: boolean;
	isSubmitDisabled: boolean;
	onSubmit: () => void | Promise<void>;
	onStop?: () => void;
	onEnqueue?: () => void;
	submitTooltip: string;
	iterationTooltip: string;
	stopTooltip: string;
	enqueueTooltip: string;
}) {
	//
	const [isOptionHeld, setIsOptionHeld] = useState(false);

	useEffect(() => {
		//
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.altKey) setIsOptionHeld(true);
		};
		const handleKeyUp = (event: KeyboardEvent) => {
			if (!event.altKey) setIsOptionHeld(false);
		};

		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
		};
	}, []);

	if (canRequestIteration) {
		return (
			<ActionButton
				icon={<Sparkles className="size-5" />}
				onClick={() => void onSubmit()}
				tooltip={iterationTooltip}
			/>
		);
	}

	if (isActing && onStop) {
		return <ActionButton icon={<Square className="size-5" />} onClick={onStop} tooltip={stopTooltip} />;
	}

	if (isOptionHeld && onEnqueue && !isEmpty) {
		return (
			<ActionButton
				icon={<Hourglass className="size-5" />}
				onClick={onEnqueue}
				disabled={isEmpty}
				tooltip={enqueueTooltip}
			/>
		);
	}

	return (
		<ActionButton
			icon={<ArrowUp className="size-5" />}
			onClick={() => void onSubmit()}
			disabled={isSubmitDisabled || (isEmpty && !hasQueuedItems)}
			tooltip={submitTooltip}
		/>
	);
}

function RecordingPanel({
	transcript,
	transcriptionMode,
	inputLevel,
	elapsedMs,
	stopRecording,
	cancelRecording,
}: {
	transcript?: string;
	transcriptionMode: TranscriptionMode;
	inputLevel: number;
	elapsedMs: number;
	stopRecording: () => void;
	cancelRecording: () => void;
}) {
	//
	return (
		<>
			<div className="flex min-w-0 flex-grow flex-col justify-center gap-2 px-2">
				<div className="flex items-center gap-2 text-sm">
					<span className="size-2 shrink-0 animate-pulse rounded-full bg-red-500" />
					<TextShimmer text="Listening..." size="lg" />
					<VoiceModeBadge mode={transcriptionMode} />
					<span className="text-muted-foreground ml-auto text-xs tabular-nums">
						{formatElapsed(elapsedMs)}
					</span>
				</div>
				<AudioLevelMeter level={inputLevel} />
				{transcript && (
					<p className="text-primary max-h-28 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-relaxed">
						{transcript}
					</p>
				)}
			</div>

			<div className="flex items-center justify-between gap-2 pt-2">
				<div className="flex items-center gap-2" />
				<div className="flex items-center gap-2">
					<ActionButton
						icon={<Square className="size-5" />}
						onClick={stopRecording}
						tooltip="Stop & transcribe"
						variant="secondary"
					/>
					<ActionButton
						icon={<X className="size-5" />}
						onClick={cancelRecording}
						tooltip="Cancel recording"
						variant="destructive"
					/>
				</div>
			</div>
		</>
	);
}

function TranscribingPanel({
	transcript,
	transcriptionMode,
	cancelRecording,
}: {
	transcript?: string;
	transcriptionMode: TranscriptionMode;
	cancelRecording: () => void;
}) {
	//
	return (
		<>
			<div className="flex min-w-0 flex-grow flex-col justify-center gap-2 px-2">
				<div className="flex items-center gap-2">
					<TextShimmer text="Finalizing..." size="lg" />
					<VoiceModeBadge mode={transcriptionMode} />
				</div>
				{transcript && (
					<p className="text-primary max-h-28 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-relaxed">
						{transcript}
					</p>
				)}
			</div>

			<div className="flex items-center justify-between gap-2 pt-2">
				<div className="flex items-center gap-2" />
				<div className="flex items-center gap-2">
					<ActionButton
						icon={<X className="size-5" />}
						onClick={cancelRecording}
						tooltip="Cancel transcription"
						variant="destructive"
					/>
				</div>
			</div>
		</>
	);
}

function VoiceModeBadge({ mode }: { mode: TranscriptionMode }) {
	//
	const isBuffered = mode === 'fallback';
	const isLive = mode === 'realtime';

	return (
		<span
			className={cn(
				'rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none',
				isLive && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
				isBuffered && 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
				!isLive && !isBuffered && 'border-border bg-muted text-muted-foreground',
			)}
		>
			{modeLabel(mode)}
		</span>
	);
}

function AudioLevelMeter({ level }: { level: number }) {
	//
	const bars = useMemo(
		() =>
			[
				['a', 0.22],
				['b', 0.38],
				['c', 0.58],
				['d', 0.78],
				['e', 1],
				['f', 0.78],
				['g', 0.58],
				['h', 0.38],
				['i', 0.22],
			] as const,
		[],
	);
	const clamped = Math.max(0, Math.min(1, level));

	return (
		<div className="flex h-5 items-center gap-1" aria-hidden="true">
			{bars.map(([id, height], index) => (
				<span
					key={id}
					className="bg-primary/45 w-1 rounded-full transition-all duration-75"
					style={{
						height: `${Math.max(4, height * (8 + clamped * 12))}px`,
						opacity: 0.28 + Math.min(0.72, clamped + index / 30),
					}}
				/>
			))}
		</div>
	);
}

function modeLabel(mode: TranscriptionMode) {
	//
	if (mode === 'realtime') return 'Live';
	if (mode === 'fallback') return 'Buffered';
	if (mode === 'connecting') return 'Connecting';
	return 'Ready';
}

function formatElapsed(elapsedMs: number) {
	//
	const seconds = Math.floor(elapsedMs / 1000);
	const minutes = Math.floor(seconds / 60);
	return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}
