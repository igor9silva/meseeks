import {
	ArrowUp,
	AudioLines,
	BookOpenText,
	Check,
	Gauge,
	Hourglass,
	Languages,
	Mic,
	RadioTower,
	Sparkles,
	Square,
	X,
} from 'lucide-react';
import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { ActionButton } from '@reactor/ui/action-button';
import { Button } from '@reactor/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@reactor/ui/popover';
import { Switch } from '@reactor/ui/switch';
import { TooltipProvider } from '@reactor/ui/tooltip';
import { useKeyboardShortcut } from '@reactor/ui/hooks/useKeyboardShortcuts';
import { cn } from '@reactor/ui/lib/utils';
import { TextShimmer } from '@reactor/ui/text-shimmer';
import {
	type DictationLatencyMode,
	type DictationStatus,
	type DictationTransport,
	type DictationTurn,
	type DictationVadMode,
	useRealtimeDictation,
} from '~/hooks/useRealtimeDictation';
import {
	getVoiceTextAnchor,
	insertVoiceText,
	parseDictionaryTerms,
	type VoiceInsertMode,
	type VoiceTextAnchor,
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

const builtInDictionary = ['Meseeks', 'Convex', 'TanStack', 'Realtime', 'Whisper', 'OpenAI'];

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
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);
	const voiceAnchorRef = useRef<VoiceTextAnchor | null>(null);
	const [localValue, setLocalValue] = useState(value);
	const [insertMode, setInsertMode] = useState<VoiceInsertMode>('insert');
	const [streamIntoPrompt, setStreamIntoPrompt] = useState(true);
	const [latencyMode, setLatencyMode] = useState<DictationLatencyMode>('fast');
	const [vadMode, setVadMode] = useState<DictationVadMode>('semantic');
	const [language, setLanguage] = useState('auto');
	const [dictionaryDraft, setDictionaryDraft] = useState('');

	const isEmpty = localValue.trim().length === 0;
	const submitBlocked = submitDisabled || (!canRequestIteration && isEmpty && !hasQueuedItems);

	const contextTerms = useMemo(() => extractContextTerms(promptContext), [promptContext]);
	const dictionaryTerms = useMemo(
		() =>
			dedupe([
				...(dictionary ?? []),
				...builtInDictionary,
				...contextTerms,
				...parseDictionaryTerms(dictionaryDraft),
			]),
		[dictionary, dictionaryDraft, contextTerms],
	);

	const resizeTextarea = useCallback(() => {
		const textarea = textareaRef.current;
		if (!textarea) return;
		textarea.style.height = '0px';
		textarea.style.height = `${Math.min(260, Math.max(44, textarea.scrollHeight))}px`;
	}, []);

	useLayoutEffect(() => {
		resizeTextarea();
	}, [localValue, resizeTextarea]);

	useEffect(() => {
		if (value !== localValue) {
			setLocalValue(value);
		}
	}, [value, localValue]);

	const focusEnd = useCallback(() => {
		const textarea = textareaRef.current;
		if (!textarea) return;
		textarea.focus();
		const length = textarea.value.length;
		textarea.setSelectionRange(length, length);
	}, []);

	useImperativeHandle(ref, () => ({ focusEnd }), [focusEnd]);

	const setComposerValue = useCallback(
		(nextValue: string) => {
			setLocalValue(nextValue);
			onValueChange(nextValue);
		},
		[onValueChange],
	);

	const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
		setComposerValue(event.target.value);
	};

	const applyDictationText = useCallback(
		(text: string) => {
			const anchor = voiceAnchorRef.current ?? getVoiceTextAnchor(textareaRef.current, localValue, insertMode);
			setComposerValue(insertVoiceText(anchor, text));
		},
		[insertMode, localValue, setComposerValue],
	);

	const handleDictationCancel = useCallback(() => {
		const anchor = voiceAnchorRef.current;
		if (anchor) setComposerValue(anchor.value);
		voiceAnchorRef.current = null;
	}, [setComposerValue]);

	const handleDictationComplete = useCallback(
		(text: string) => {
			applyDictationText(text);
			voiceAnchorRef.current = null;
		},
		[applyDictationText],
	);

	const dictation = useRealtimeDictation({
		promptContext,
		dictionary: dictionaryTerms,
		...(language === 'auto' ? {} : { language }),
		vadMode,
		latencyMode,
		onTranscript: (text) => {
			if (streamIntoPrompt) applyDictationText(text);
		},
		onComplete: handleDictationComplete,
		onCancel: handleDictationCancel,
	});

	const isDictating = dictation.status !== 'idle';

	const handleStartDictation = async () => {
		voiceAnchorRef.current = getVoiceTextAnchor(textareaRef.current, localValue, insertMode);
		await dictation.start();
	};

	useKeyboardShortcut({
		targetRef: textareaRef,
		global: submitShortcutScope === 'global',
		combo: { withCommand: true, key: 'Enter' },
		callback: () => {
			if (submitShortcutScope === 'none') return;
			if (!isDictating && !isStopping && !submitBlocked) void onSubmit();
		},
	});

	useKeyboardShortcut({
		targetRef: textareaRef,
		combo: { withAlt: true, key: 'Enter' },
		callback: () => {
			if (!isDictating && onEnqueue && !isEmpty) onEnqueue();
		},
	});

	return (
		<TooltipProvider>
			<div className={cn('bg-sidebar mx-2 mb-2 overflow-hidden rounded-2xl border shadow-sm', className)}>
				{strips && !isDictating && <div className="border-b border-border/50">{strips}</div>}

				<div className="flex flex-col gap-2 p-2">
					{isDictating && (
						<DictationPanel
							status={dictation.status}
							transport={dictation.transport}
							turns={dictation.turns}
							activeText={dictation.activeText}
							inputLevel={dictation.inputLevel}
							elapsedMs={dictation.elapsedMs}
							error={dictation.error}
							dictionaryCount={dictionaryTerms.length}
							latencyMode={latencyMode}
							vadMode={vadMode}
							streamIntoPrompt={streamIntoPrompt}
							stop={dictation.stop}
							cancel={dictation.cancel}
						/>
					)}

					<div className={cn('flex flex-col gap-2', isDictating && 'opacity-80')}>
						<textarea
							ref={textareaRef}
							value={localValue}
							onChange={handleChange}
							placeholder={placeholder}
							disabled={isDictating && !streamIntoPrompt}
							className={cn(
								'text-primary min-h-11 w-full resize-none border-none bg-transparent px-2 py-2 leading-relaxed shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-80',
								textareaClassName,
							)}
						/>

						<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
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

									<DictationSettings
										insertMode={insertMode}
										setInsertMode={setInsertMode}
										streamIntoPrompt={streamIntoPrompt}
										setStreamIntoPrompt={setStreamIntoPrompt}
										latencyMode={latencyMode}
										setLatencyMode={setLatencyMode}
										vadMode={vadMode}
										setVadMode={setVadMode}
										language={language}
										setLanguage={setLanguage}
										dictionaryDraft={dictionaryDraft}
										setDictionaryDraft={setDictionaryDraft}
										dictionaryTerms={dictionaryTerms}
									/>

									<ActionButton
										icon={<Mic className="size-5" />}
										onClick={handleStartDictation}
										disabled={isDictating}
										tooltip="Dictate"
										variant="secondary"
									/>

									<PrimaryActionButton
										canRequestIteration={canRequestIteration}
										isActing={isActing}
										isEmpty={isEmpty}
										hasQueuedItems={hasQueuedItems}
										isSubmitDisabled={submitBlocked || isDictating}
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
				</div>
			</div>
		</TooltipProvider>
	);
});

function DictationPanel({
	status,
	transport,
	turns,
	activeText,
	inputLevel,
	elapsedMs,
	error,
	dictionaryCount,
	latencyMode,
	vadMode,
	streamIntoPrompt,
	stop,
	cancel,
}: {
	status: DictationStatus;
	transport: DictationTransport;
	turns: DictationTurn[];
	activeText: string;
	inputLevel: number;
	elapsedMs: number;
	error: string | null;
	dictionaryCount: number;
	latencyMode: DictationLatencyMode;
	vadMode: DictationVadMode;
	streamIntoPrompt: boolean;
	stop: () => void;
	cancel: () => void;
}) {
	return (
		<div className="rounded-xl border border-border/70 bg-background/60 p-3">
			<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
				<div className="min-w-0 flex-1 space-y-2">
					<div className="flex flex-wrap items-center gap-2 text-sm">
						<span className="size-2 animate-pulse rounded-full bg-red-500" />
						<TextShimmer text={status === 'finalizing' ? 'Finalizing...' : 'Streaming...'} size="lg" />
						<ModeBadge transport={transport} />
						<span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
							{latencyMode}
						</span>
						<span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
							{vadMode}
						</span>
						<span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
							{dictionaryCount} terms
						</span>
						<span className="ml-auto font-mono text-xs text-muted-foreground">
							{formatElapsed(elapsedMs)}
						</span>
					</div>

					<AudioLevelMeter level={inputLevel} />

					<div className="min-h-12 rounded-lg bg-muted/40 px-3 py-2 text-sm leading-relaxed">
						{activeText ? (
							<p className="max-h-28 overflow-y-auto whitespace-pre-wrap break-words">{activeText}</p>
						) : (
							<p className="text-muted-foreground">
								{transport === 'fallback' ? 'Buffering audio...' : 'Listening...'}
							</p>
						)}
					</div>

					{turns.length > 1 && (
						<div className="flex max-h-24 flex-col gap-1 overflow-y-auto">
							{turns.map((turn, index) => (
								<div key={turn.itemId} className="flex items-start gap-2 text-xs text-muted-foreground">
									<span className="mt-0.5 min-w-5 rounded bg-muted px-1 text-center font-mono">
										{index + 1}
									</span>
									<span className="line-clamp-2 flex-1">{turn.finalText ?? turn.text}</span>
									{turn.confidence !== undefined && (
										<span className="font-mono">{Math.round(turn.confidence * 100)}%</span>
									)}
								</div>
							))}
						</div>
					)}

					{error && <p className="text-xs text-amber-600 dark:text-amber-300">{error}</p>}
					{!streamIntoPrompt && activeText && <p className="text-xs text-muted-foreground">Preview only</p>}
				</div>

				<div className="flex items-center justify-end gap-2">
					<ActionButton
						icon={<Square className="size-5" />}
						onClick={stop}
						tooltip="Stop dictation"
						variant="secondary"
					/>
					<ActionButton
						icon={<X className="size-5" />}
						onClick={cancel}
						tooltip="Cancel"
						variant="destructive"
					/>
				</div>
			</div>
		</div>
	);
}

function DictationSettings({
	insertMode,
	setInsertMode,
	streamIntoPrompt,
	setStreamIntoPrompt,
	latencyMode,
	setLatencyMode,
	vadMode,
	setVadMode,
	language,
	setLanguage,
	dictionaryDraft,
	setDictionaryDraft,
	dictionaryTerms,
}: {
	insertMode: VoiceInsertMode;
	setInsertMode: (mode: VoiceInsertMode) => void;
	streamIntoPrompt: boolean;
	setStreamIntoPrompt: (value: boolean) => void;
	latencyMode: DictationLatencyMode;
	setLatencyMode: (mode: DictationLatencyMode) => void;
	vadMode: DictationVadMode;
	setVadMode: (mode: DictationVadMode) => void;
	language: string;
	setLanguage: (language: string) => void;
	dictionaryDraft: string;
	setDictionaryDraft: (value: string) => void;
	dictionaryTerms: string[];
}) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button type="button" variant="secondary" size="icon" className="h-9 w-9" aria-label="Diction">
					<BookOpenText className="size-4" />
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-96 p-0">
				<div className="space-y-4 p-4">
					<div className="flex items-center justify-between gap-3">
						<div className="flex items-center gap-2 text-sm font-medium">
							<BookOpenText className="size-4" />
							Diction
						</div>
						<span className="text-xs text-muted-foreground">{dictionaryTerms.length} terms</span>
					</div>

					<SettingRow icon={<RadioTower className="size-4" />} label="Mode">
						<SegmentedControl
							value={insertMode}
							options={[
								['insert', 'Insert'],
								['replace', 'Replace'],
								['append', 'Append'],
							]}
							onChange={(next) => setInsertMode(next as VoiceInsertMode)}
						/>
					</SettingRow>

					<SettingRow icon={<Gauge className="size-4" />} label="Latency">
						<SegmentedControl
							value={latencyMode}
							options={[
								['fast', 'Fast'],
								['balanced', 'Balanced'],
								['accurate', 'Accurate'],
							]}
							onChange={(next) => setLatencyMode(next as DictationLatencyMode)}
						/>
					</SettingRow>

					<SettingRow icon={<AudioLines className="size-4" />} label="VAD">
						<SegmentedControl
							value={vadMode}
							options={[
								['semantic', 'Semantic'],
								['server', 'Server'],
							]}
							onChange={(next) => setVadMode(next as DictationVadMode)}
						/>
					</SettingRow>

					<SettingRow icon={<Languages className="size-4" />} label="Language">
						<SegmentedControl
							value={language}
							options={[
								['auto', 'Auto'],
								['en', 'EN'],
								['pt', 'PT'],
							]}
							onChange={setLanguage}
						/>
					</SettingRow>

					<div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
						<span className="text-sm">Live insert</span>
						<Switch checked={streamIntoPrompt} onCheckedChange={setStreamIntoPrompt} />
					</div>

					<textarea
						value={dictionaryDraft}
						onChange={(event) => setDictionaryDraft(event.target.value)}
						placeholder="Project terms, names, acronyms"
						className="min-h-24 w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
					/>

					<div className="flex max-h-20 flex-wrap gap-1 overflow-y-auto">
						{dictionaryTerms.slice(0, 36).map((term) => (
							<span
								key={term}
								className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
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

function SettingRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
	return (
		<div className="flex items-center justify-between gap-3">
			<div className="flex items-center gap-2 text-sm text-muted-foreground">
				{icon}
				<span>{label}</span>
			</div>
			{children}
		</div>
	);
}

function SegmentedControl({
	value,
	options,
	onChange,
}: {
	value: string;
	options: Array<[string, string]>;
	onChange: (value: string) => void;
}) {
	return (
		<div className="inline-flex rounded-lg border bg-muted/40 p-0.5">
			{options.map(([optionValue, label]) => (
				<button
					key={optionValue}
					type="button"
					onClick={() => onChange(optionValue)}
					className={cn(
						'flex h-7 items-center gap-1 rounded-md px-2 text-xs transition-colors',
						value === optionValue
							? 'bg-background text-foreground shadow-sm'
							: 'text-muted-foreground hover:text-foreground',
					)}
				>
					{value === optionValue && <Check className="size-3" />}
					{label}
				</button>
			))}
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
		<>
			{isActing && <ShortcutHint modifier="^" keySymbol="C" text="interrupt" />}
			{isBlocked && <ShortcutHint modifier="⌥" keySymbol="⏎" text="authorize" />}
			{canEnqueue && !isEmpty && <ShortcutHint modifier="⌥" keySymbol="⏎" text="queue" />}
			{isComposing && <ShortcutHint modifier="⌘" keySymbol="⏎" text="act" />}
			{canRequestIteration && <ShortcutHint modifier="⌘" keySymbol="⏎" text="iterate" />}
		</>
	);
}

function ShortcutHint({ modifier, keySymbol, text }: { modifier: string; keySymbol: string; text: string }) {
	return (
		<span className="hidden items-center gap-1 text-xs text-muted-foreground md:flex">
			<kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{modifier}</kbd>
			<kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{keySymbol}</kbd>
			{text}
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

function ModeBadge({ transport }: { transport: DictationTransport }) {
	const isRealtime = transport === 'webrtc';
	const isFallback = transport === 'fallback';

	return (
		<span
			className={cn(
				'rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none',
				isRealtime && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
				isFallback && 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
				!isRealtime && !isFallback && 'border-border bg-muted text-muted-foreground',
			)}
		>
			{isRealtime ? 'Realtime' : isFallback ? 'Fallback' : 'Connecting'}
		</span>
	);
}

function AudioLevelMeter({ level }: { level: number }) {
	const bars = [
		['a', 0.22],
		['b', 0.38],
		['c', 0.58],
		['d', 0.78],
		['e', 1],
		['f', 0.78],
		['g', 0.58],
		['h', 0.38],
		['i', 0.22],
	] as const;
	const clamped = Math.max(0, Math.min(1, level));

	return (
		<div className="flex h-5 items-center gap-1" aria-hidden="true">
			{bars.map(([id, height], index) => (
				<span
					key={id}
					className="w-1 rounded-full bg-primary/45 transition-all duration-75"
					style={{
						height: `${Math.max(4, height * (8 + clamped * 14))}px`,
						opacity: 0.28 + Math.min(0.72, clamped + index / 30),
					}}
				/>
			))}
		</div>
	);
}

function formatElapsed(elapsedMs: number) {
	const seconds = Math.floor(elapsedMs / 1000);
	const minutes = Math.floor(seconds / 60);
	return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

function extractContextTerms(context?: string) {
	if (!context) return [];
	return Array.from(
		context.matchAll(/\b[A-Z][A-Za-z0-9]*(?:[.-][A-Za-z0-9]+)*\b|[A-Z]{2,}\b/g),
		(match) => match[0],
	).slice(0, 40);
}

function dedupe(values: string[]) {
	const seen = new Set<string>();
	const result: string[] = [];

	for (const value of values) {
		const term = value.trim();
		const key = term.toLowerCase();
		if (!term || seen.has(key)) continue;
		seen.add(key);
		result.push(term);
	}

	return result;
}
