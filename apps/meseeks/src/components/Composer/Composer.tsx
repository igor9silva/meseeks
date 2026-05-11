import {
	ArrowUp,
	AudioLines,
	Check,
	Gauge,
	Hourglass,
	Languages,
	Mic,
	RadioTower,
	Settings2,
	Sparkles,
	Square,
	Type,
	X,
} from 'lucide-react';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ChangeEvent, ReactNode } from 'react';
import { ActionButton } from '@reactor/ui/action-button';
import { Button } from '@reactor/ui/button';
import { useExpandingTextarea } from '@reactor/ui/hooks/useExpandingTextarea';
import { useKeyboardShortcut } from '@reactor/ui/hooks/useKeyboardShortcuts';
import { cn } from '@reactor/ui/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@reactor/ui/popover';
import { TooltipProvider } from '@reactor/ui/tooltip';
import {
	type ComposerTranscriptStatus,
	type ComposerTranscriptTransport,
	type ComposerVadMode,
	type ComposerVoiceLatency,
	type ComposerVoiceTurn,
	useComposerTranscription,
} from '~/hooks/useComposerTranscription';
import {
	applyVoiceText,
	getVoiceTextAnchor,
	parseDictionaryTerms,
	type VoiceTextAnchor,
	type VoiceTextMode,
} from '~/lib/voiceText';

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
	dictionary?: string[];
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

const baseDictionary = ['Meseeks', 'Convex', 'TanStack', 'Realtime', 'Whisper', 'OpenAI'];

export const Composer = forwardRef<ComposerHandle, ComposerProps>(function Composer(
	{
		value,
		onValueChange,
		onSubmit,
		onEnqueue,
		onStop,
		placeholder = "What's next?",
		promptContext,
		dictionary,
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
	const {
		textareaRef,
		value: localValue,
		isEmpty,
		onChange: handleLocalValueChange,
		setValue: setLocalValue,
	} = useExpandingTextarea({ initialValue: value, singleLineHeight: 52 });

	const [voiceMode, setVoiceMode] = useState<VoiceTextMode>('insert');
	const [latency, setLatency] = useState<ComposerVoiceLatency>('fast');
	const [vadMode, setVadMode] = useState<ComposerVadMode>('semantic');
	const [language, setLanguage] = useState('auto');
	const [dictionaryDraft, setDictionaryDraft] = useState('');
	const voiceAnchorRef = useRef<VoiceTextAnchor | null>(null);

	const contextTerms = useMemo(() => extractContextTerms(promptContext), [promptContext]);
	const dictionaryTerms = useMemo(
		() =>
			dedupe([
				...baseDictionary,
				...(dictionary ?? []),
				...contextTerms,
				...parseDictionaryTerms(dictionaryDraft),
			]).slice(0, 100),
		[dictionary, dictionaryDraft, contextTerms],
	);

	useEffect(() => {
		if (value !== localValue) setLocalValue(value);
	}, [value, localValue, setLocalValue]);

	const setComposerValue = useCallback(
		(nextValue: string) => {
			setLocalValue(nextValue);
			onValueChange(nextValue);
		},
		[onValueChange, setLocalValue],
	);

	const applyTranscript = useCallback(
		(text: string) => {
			const anchor = voiceAnchorRef.current ?? getVoiceTextAnchor(textareaRef.current, localValue, voiceMode);
			const nextValue = applyVoiceText(anchor, text);
			setComposerValue(nextValue);
		},
		[localValue, setComposerValue, textareaRef, voiceMode],
	);

	const cancelTranscript = useCallback(() => {
		const anchor = voiceAnchorRef.current;
		if (anchor) setComposerValue(anchor.value);
		voiceAnchorRef.current = null;
	}, [setComposerValue]);

	const completeTranscript = useCallback(
		(text: string) => {
			applyTranscript(text);
			voiceAnchorRef.current = null;
		},
		[applyTranscript],
	);

	const transcription = useComposerTranscription({
		promptContext,
		dictionary: dictionaryTerms,
		language: language === 'auto' ? undefined : language,
		vadMode,
		latency,
		onTranscript: applyTranscript,
		onComplete: completeTranscript,
		onCancel: cancelTranscript,
	});

	const isVoiceActive = transcription.status !== 'idle';
	const submitBlocked = submitDisabled || (!canRequestIteration && isEmpty && !hasQueuedItems) || isVoiceActive;
	const activePlaceholder = isVoiceActive ? 'Speak. The draft updates here.' : placeholder;

	const focusEnd = useCallback(() => {
		const textarea = textareaRef.current;
		if (!textarea) return;
		textarea.focus();
		const length = textarea.value.length;
		textarea.setSelectionRange(length, length);
	}, [textareaRef]);

	useImperativeHandle(ref, () => ({ focusEnd }), [focusEnd]);

	const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
		handleLocalValueChange(event);
		onValueChange(event.target.value);

		if (isVoiceActive) {
			voiceAnchorRef.current = getVoiceTextAnchor(event.target, event.target.value, voiceMode);
		}
	};

	const startVoice = async () => {
		const anchor = getVoiceTextAnchor(textareaRef.current, localValue, voiceMode);
		voiceAnchorRef.current = anchor;
		await transcription.start();
		textareaRef.current?.focus();
	};

	const stopVoice = () => {
		transcription.stop();
		textareaRef.current?.focus();
	};

	const cancelVoice = () => {
		transcription.cancel();
		textareaRef.current?.focus();
	};

	useKeyboardShortcut({
		targetRef: textareaRef,
		global: submitShortcutScope === 'global',
		combo: { withCommand: true, key: 'Enter' },
		callback: () => {
			if (submitShortcutScope === 'none') return;
			if (!isVoiceActive && !isStopping && !submitBlocked) void onSubmit();
		},
	});

	useKeyboardShortcut({
		targetRef: textareaRef,
		combo: { withAlt: true, key: 'Enter' },
		callback: () => {
			if (!isVoiceActive && onEnqueue && !isEmpty) onEnqueue();
		},
	});

	return (
		<TooltipProvider>
			<div
				className={cn(
					'mx-2 mb-2 overflow-hidden rounded-xl border bg-background shadow-sm transition-[border-color,box-shadow,background-color]',
					isVoiceActive && 'border-primary/45 shadow-[0_0_0_1px_hsl(var(--primary)/0.14)]',
					className,
				)}
			>
				{strips && <div className="border-b border-border/60">{strips}</div>}

				<div className="grid gap-0">
					<div className="px-3 pt-3">
						<VoiceStatusRow
							status={transcription.status}
							transport={transcription.transport}
							error={transcription.error}
							elapsedMs={transcription.elapsedMs}
							turns={transcription.turns}
							voiceMode={voiceMode}
							latency={latency}
							dictionaryCount={dictionaryTerms.length}
						/>

						<div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
							<VoiceMeter active={isVoiceActive} level={transcription.inputLevel} />
							<textarea
								ref={textareaRef}
								value={localValue}
								onChange={handleChange}
								placeholder={activePlaceholder}
								className={cn(
									'min-h-16 w-full resize-none border-none bg-transparent py-1 text-base leading-6 text-primary shadow-none outline-none placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0',
									textareaClassName,
								)}
							/>
						</div>
					</div>

					<div className="flex flex-col gap-2 px-3 py-3 md:flex-row md:items-center md:justify-between">
						<div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
							{leadingControls}
							{isVoiceActive && (
								<VoiceInlineStatus
									text={transcription.liveText}
									status={transcription.status}
									transport={transcription.transport}
								/>
							)}
						</div>

						<div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
							{secondaryControls}
							{showShortcutHints && !isVoiceActive && (
								<ShortcutHints
									isActing={isActing}
									isBlocked={isBlocked}
									isComposing={isComposing}
									isEmpty={isEmpty}
									canRequestIteration={canRequestIteration}
									canEnqueue={Boolean(onEnqueue)}
								/>
							)}
							<VoiceSettings
								voiceMode={voiceMode}
								setVoiceMode={setVoiceMode}
								latency={latency}
								setLatency={setLatency}
								vadMode={vadMode}
								setVadMode={setVadMode}
								language={language}
								setLanguage={setLanguage}
								dictionaryDraft={dictionaryDraft}
								setDictionaryDraft={setDictionaryDraft}
								dictionaryTerms={dictionaryTerms}
								disabled={isVoiceActive}
							/>
							<VoiceActionButtons
								status={transcription.status}
								onStart={startVoice}
								onStop={stopVoice}
								onCancel={cancelVoice}
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
			</div>
		</TooltipProvider>
	);
});

function VoiceStatusRow({
	status,
	transport,
	error,
	elapsedMs,
	turns,
	voiceMode,
	latency,
	dictionaryCount,
}: {
	status: ComposerTranscriptStatus;
	transport: ComposerTranscriptTransport;
	error: string | null;
	elapsedMs: number;
	turns: ComposerVoiceTurn[];
	voiceMode: VoiceTextMode;
	latency: ComposerVoiceLatency;
	dictionaryCount: number;
}) {
	if (status === 'idle' && !error) return null;

	return (
		<div className="mb-2 flex min-h-6 flex-wrap items-center gap-2 text-xs text-muted-foreground">
			<span
				className={cn(
					'inline-flex items-center gap-1 rounded-full border px-2 py-1 font-medium',
					status === 'idle' && 'border-border',
					status !== 'idle' &&
						transport === 'webrtc' &&
						'border-emerald-500/35 text-emerald-600 dark:text-emerald-400',
					status !== 'idle' &&
						transport === 'fallback' &&
						'border-amber-500/35 text-amber-700 dark:text-amber-300',
					status !== 'idle' && transport === 'idle' && 'border-primary/30 text-primary',
				)}
			>
				<AudioLines className="size-3.5" />
				{voiceLabel(status, transport)}
			</span>
			<span className="rounded-full border border-border/70 px-2 py-1">{voiceMode}</span>
			<span className="rounded-full border border-border/70 px-2 py-1">{latency}</span>
			<span className="rounded-full border border-border/70 px-2 py-1">{dictionaryCount} terms</span>
			{turns.length > 0 && (
				<span className="rounded-full border border-border/70 px-2 py-1">{turns.length} turns</span>
			)}
			<span className="ml-auto font-mono tabular-nums">{formatElapsed(elapsedMs)}</span>
			{error && <span className="basis-full text-amber-600 dark:text-amber-300">{error}</span>}
		</div>
	);
}

function VoiceInlineStatus({
	text,
	status,
	transport,
}: {
	text: string;
	status: ComposerTranscriptStatus;
	transport: ComposerTranscriptTransport;
}) {
	const label = text.trim() || (status === 'finalizing' ? 'Finalizing voice' : 'Listening');

	return (
		<div className="flex min-w-[12rem] flex-1 items-center gap-2 rounded-full border border-border/70 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
			<span
				className={cn(
					'size-2 shrink-0 rounded-full',
					transport === 'fallback' ? 'bg-amber-500' : 'bg-emerald-500',
					status !== 'finalizing' && 'animate-pulse',
				)}
			/>
			<span className="truncate">{label}</span>
		</div>
	);
}

function VoiceMeter({ active, level }: { active: boolean; level: number }) {
	const clamped = Math.max(0, Math.min(1, active ? level : 0));
	const bars = [0.25, 0.5, 0.85, 1, 0.7, 0.42] as const;

	return (
		<div className="flex w-7 items-center justify-center py-1" aria-hidden="true">
			<div className="flex h-16 items-center gap-0.5">
				{bars.map((height, index) => (
					<span
						key={`${height}-${index}`}
						className={cn(
							'w-0.5 rounded-full transition-all duration-100',
							active ? 'bg-primary/65' : 'bg-muted-foreground/25',
						)}
						style={{
							height: `${Math.max(8, height * (18 + clamped * 38))}px`,
							opacity: active ? 0.35 + clamped : 0.4,
						}}
					/>
				))}
			</div>
		</div>
	);
}

function VoiceSettings({
	voiceMode,
	setVoiceMode,
	latency,
	setLatency,
	vadMode,
	setVadMode,
	language,
	setLanguage,
	dictionaryDraft,
	setDictionaryDraft,
	dictionaryTerms,
	disabled,
}: {
	voiceMode: VoiceTextMode;
	setVoiceMode: (mode: VoiceTextMode) => void;
	latency: ComposerVoiceLatency;
	setLatency: (latency: ComposerVoiceLatency) => void;
	vadMode: ComposerVadMode;
	setVadMode: (mode: ComposerVadMode) => void;
	language: string;
	setLanguage: (language: string) => void;
	dictionaryDraft: string;
	setDictionaryDraft: (value: string) => void;
	dictionaryTerms: string[];
	disabled: boolean;
}) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					size="icon"
					className="h-8 w-8 rounded-full"
					disabled={disabled}
					aria-label="Voice settings"
				>
					<Settings2 className="size-4" />
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-96 max-w-[calc(100vw-2rem)] p-3">
				<div className="grid gap-3">
					<SettingGroup icon={<Type className="size-4" />} label="Write">
						<Segmented
							value={voiceMode}
							options={[
								['insert', 'Insert'],
								['replace', 'Replace'],
								['append', 'Append'],
							]}
							onChange={(value) => setVoiceMode(value as VoiceTextMode)}
						/>
					</SettingGroup>

					<SettingGroup icon={<Gauge className="size-4" />} label="Latency">
						<Segmented
							value={latency}
							options={[
								['fast', 'Fast'],
								['balanced', 'Balanced'],
								['accurate', 'Accurate'],
							]}
							onChange={(value) => setLatency(value as ComposerVoiceLatency)}
						/>
					</SettingGroup>

					<SettingGroup icon={<RadioTower className="size-4" />} label="Turns">
						<Segmented
							value={vadMode}
							options={[
								['semantic', 'Semantic'],
								['server', 'Server'],
							]}
							onChange={(value) => setVadMode(value as ComposerVadMode)}
						/>
					</SettingGroup>

					<SettingGroup icon={<Languages className="size-4" />} label="Language">
						<Segmented
							value={language}
							options={[
								['auto', 'Auto'],
								['en', 'EN'],
								['pt', 'PT'],
							]}
							onChange={setLanguage}
						/>
					</SettingGroup>

					<label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
						<span>Dictionary</span>
						<textarea
							value={dictionaryDraft}
							onChange={(event) => setDictionaryDraft(event.target.value)}
							className="min-h-16 resize-none rounded-md border bg-background px-2 py-2 text-sm font-normal text-primary outline-none focus-visible:ring-1 focus-visible:ring-ring"
							placeholder="Names, APIs, commands..."
						/>
					</label>

					<div className="flex max-h-16 flex-wrap gap-1 overflow-y-auto">
						{dictionaryTerms.slice(0, 18).map((term) => (
							<span
								key={term}
								className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground"
							>
								{term}
							</span>
						))}
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}

function SettingGroup({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
	return (
		<div className="grid gap-1.5">
			<div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
				{icon}
				<span>{label}</span>
			</div>
			{children}
		</div>
	);
}

function Segmented({
	value,
	options,
	onChange,
}: {
	value: string;
	options: Array<[string, string]>;
	onChange: (value: string) => void;
}) {
	return (
		<div
			className="grid grid-cols-[repeat(var(--segments),minmax(0,1fr))] rounded-md border bg-muted/30 p-0.5"
			style={{ '--segments': options.length } as CSSProperties}
		>
			{options.map(([optionValue, label]) => (
				<button
					key={optionValue}
					type="button"
					onClick={() => onChange(optionValue)}
					className={cn(
						'inline-flex h-7 items-center justify-center rounded px-2 text-xs font-medium text-muted-foreground transition-colors',
						value === optionValue && 'bg-background text-primary shadow-xs',
					)}
				>
					{value === optionValue && <Check className="mr-1 size-3" />}
					<span className="truncate">{label}</span>
				</button>
			))}
		</div>
	);
}

function VoiceActionButtons({
	status,
	onStart,
	onStop,
	onCancel,
}: {
	status: ComposerTranscriptStatus;
	onStart: () => void | Promise<void>;
	onStop: () => void;
	onCancel: () => void;
}) {
	if (status === 'idle') {
		return (
			<ActionButton
				icon={<Mic className="size-5" />}
				onClick={() => void onStart()}
				tooltip="Dictate"
				variant="secondary"
			/>
		);
	}

	return (
		<div className="flex items-center gap-1 rounded-full border border-border/70 bg-muted/30 p-1">
			<ActionButton
				icon={<Square className="size-4" />}
				onClick={onStop}
				tooltip="Stop dictation"
				variant="secondary"
				className="h-7 w-7"
			/>
			<ActionButton
				icon={<X className="size-4" />}
				onClick={onCancel}
				tooltip="Cancel dictation"
				variant="destructive"
				className="h-7 w-7"
			/>
		</div>
	);
}

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
	return (
		<div className="hidden items-center gap-1 text-xs text-muted-foreground lg:flex">
			{isActing && <ShortcutHint modifier="^" keySymbol="C" text="interrupt" />}
			{isBlocked && <ShortcutHint modifier="⌥" keySymbol="⏎" text="authorize" />}
			{canEnqueue && !isEmpty && <ShortcutHint modifier="⌥" keySymbol="⏎" text="enqueue" />}
			{isComposing && <ShortcutHint modifier="⌘" keySymbol="⏎" text="act" />}
			{canRequestIteration && <ShortcutHint modifier="⌘" keySymbol="⏎" text="iterate" />}
		</div>
	);
}

function ShortcutHint({ modifier, keySymbol, text }: { modifier: string; keySymbol: string; text: string }) {
	return (
		<span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/30 px-2 py-1">
			<kbd className="font-mono">{modifier}</kbd>
			<kbd className="font-mono">{keySymbol}</kbd>
			<span>{text}</span>
		</span>
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
	const [isOptionHeld, setIsOptionHeld] = useState(false);

	useEffect(() => {
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

function voiceLabel(status: ComposerTranscriptStatus, transport: ComposerTranscriptTransport) {
	if (status === 'connecting') return 'Connecting';
	if (status === 'finalizing') return transport === 'fallback' ? 'Transcribing' : 'Finalizing';
	if (transport === 'fallback') return 'Buffered';
	if (transport === 'webrtc') return 'Realtime';
	return 'Listening';
}

function formatElapsed(elapsedMs: number) {
	const seconds = Math.floor(elapsedMs / 1000);
	const minutes = Math.floor(seconds / 60);
	return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

function extractContextTerms(promptContext?: string) {
	const context = promptContext?.trim();
	if (!context) return [];

	return Array.from(context.matchAll(/\b[A-Z][A-Za-z0-9]*(?:[.-][A-Za-z0-9]+)*\b|[A-Z]{2,}\b/g), (match) => match[0])
		.filter((term) => term.length > 1)
		.slice(0, 40);
}

function dedupe(values: string[]) {
	return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}
