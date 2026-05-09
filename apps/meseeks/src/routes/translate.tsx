import { createFileRoute } from '@tanstack/react-router';
import { track } from '@vercel/analytics/react';
import { Button } from '@reactor/ui/button';
import { cn } from '@reactor/ui/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@reactor/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@reactor/ui/sheet';
import { ArrowLeftRight, History, Languages, Loader2, Mic, MicOff, Volume2, Waves } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

type LanguageCode = 'en' | 'pt' | 'zh' | 'es' | 'fr' | 'de' | 'ja' | 'ko' | 'hi' | 'it';
type SideKey = 'a' | 'b';
type ConnectionStatus = 'setup' | 'idle' | 'starting' | 'connecting' | 'live' | 'error';
type Activity = 'quiet' | 'listening' | 'hearing' | 'speaking';

interface LanguageOption {
	code: LanguageCode;
	label: string;
	shortLabel: string;
}

interface TranslationChannel {
	audio: HTMLAudioElement;
	peerConnection: RTCPeerConnection;
	targetSide: SideKey;
}

interface RealtimeEvent {
	type?: string;
	delta?: string;
	text?: string;
	transcript?: string;
	error?: {
		message?: string;
	};
}

interface SecretResponse {
	clientSecret?: string;
	value?: string;
	client_secret?: string | { value?: string };
	error?: string;
}

interface TranscriptEntry {
	id: string;
	sourceSide: SideKey;
	targetSide: SideKey;
	text: string;
	time: string;
}

const apiRoute = '/api/translate/session';
const translationCallsUrl = 'https://api.openai.com/v1/realtime/translations/calls';

const languages: LanguageOption[] = [
	{ code: 'en', label: 'English', shortLabel: 'EN' },
	{ code: 'pt', label: 'Portuguese', shortLabel: 'PT' },
	{ code: 'zh', label: 'Chinese', shortLabel: 'ZH' },
	{ code: 'es', label: 'Spanish', shortLabel: 'ES' },
	{ code: 'fr', label: 'French', shortLabel: 'FR' },
	{ code: 'de', label: 'German', shortLabel: 'DE' },
	{ code: 'ja', label: 'Japanese', shortLabel: 'JA' },
	{ code: 'ko', label: 'Korean', shortLabel: 'KO' },
	{ code: 'hi', label: 'Hindi', shortLabel: 'HI' },
	{ code: 'it', label: 'Italian', shortLabel: 'IT' },
];

const languageByCode = Object.fromEntries(languages.map((language) => [language.code, language])) as Record<
	LanguageCode,
	LanguageOption
>;

export const Route = createFileRoute('/translate')({
	component: RouteComponent,
	head: () => ({
		meta: [
			{ title: 'Live Translate' },
			{
				name: 'description',
				content: 'Live speech translation.',
			},
		],
	}),
});

function RouteComponent() {
	const [languagePair, setLanguagePair] = useState<Record<SideKey, LanguageCode>>({ a: 'pt', b: 'zh' });
	const [activeSpeaker, setActiveSpeaker] = useState<SideKey>('a');
	const [status, setStatus] = useState<ConnectionStatus>('setup');
	const [activity, setActivity] = useState<Activity>('quiet');
	const [error, setError] = useState<string | null>(null);
	const [heardText, setHeardText] = useState('');
	const [liveText, setLiveText] = useState<Record<SideKey, string>>({ a: '', b: '' });
	const [history, setHistory] = useState<TranscriptEntry[]>([]);

	const channelsRef = useRef<TranslationChannel[]>([]);
	const mediaStreamRef = useRef<MediaStream | null>(null);
	const draftTextRef = useRef<Record<SideKey, string>>({ a: '', b: '' });
	const draftSourceSideRef = useRef<Record<SideKey, SideKey>>({ a: 'b', b: 'a' });
	const inputDraftRef = useRef('');
	const commitTimersRef = useRef<Partial<Record<SideKey, ReturnType<typeof setTimeout>>>>({});
	const inputTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const languagePairRef = useRef(languagePair);
	const activeSpeakerRef = useRef(activeSpeaker);
	const audibleSideRef = useRef(oppositeSide(activeSpeaker));

	const sideA = languageByCode[languagePair.a];
	const sideB = languageByCode[languagePair.b];
	const isBusy = status === 'starting' || status === 'connecting';
	const isLive = status === 'live';
	const audibleSide = oppositeSide(activeSpeaker);

	useEffect(() => {
		languagePairRef.current = languagePair;
	}, [languagePair]);

	useEffect(() => {
		activeSpeakerRef.current = activeSpeaker;
		audibleSideRef.current = oppositeSide(activeSpeaker);
		syncChannelAudio(channelsRef.current, audibleSideRef.current);
	}, [activeSpeaker]);

	useEffect(() => {
		track('live-translate', {
			status,
			aLanguage: languagePair.a,
			bLanguage: languagePair.b,
		});
	}, [status, languagePair]);

	const updateLanguage = useCallback((side: SideKey, nextLanguage: LanguageCode) => {
		setLanguagePair((current) => {
			const otherSide = oppositeSide(side);
			if (current[side] === nextLanguage) return current;
			if (current[otherSide] !== nextLanguage) return { ...current, [side]: nextLanguage };

			return {
				...current,
				[side]: nextLanguage,
				[otherSide]: current[side] === nextLanguage ? firstDifferentLanguage(nextLanguage) : current[side],
			};
		});
	}, []);

	const swapLanguages = useCallback(() => {
		setLanguagePair((current) => ({ a: current.b, b: current.a }));
	}, []);

	const addHistoryEntry = useCallback((entry: Omit<TranscriptEntry, 'id' | 'time'>) => {
		const normalizedText = entry.text.trim();
		if (!normalizedText) return;

		setHistory((current) =>
			[
				{
					...entry,
					id: createTranscriptId(),
					text: normalizedText,
					time: new Date().toLocaleTimeString('en', {
						hour: '2-digit',
						minute: '2-digit',
					}),
				},
				...current,
			].slice(0, 30),
		);
	}, []);

	const commitDraft = useCallback(
		(targetSide: SideKey) => {
			const finalText = draftTextRef.current[targetSide].trim();
			const sourceSide = draftSourceSideRef.current[targetSide];
			draftTextRef.current[targetSide] = '';

			if (finalText) addHistoryEntry({ sourceSide, targetSide, text: finalText });
			setActivity('listening');
		},
		[addHistoryEntry],
	);

	const scheduleCommit = useCallback(
		(targetSide: SideKey) => {
			const timer = commitTimersRef.current[targetSide];
			if (timer) clearTimeout(timer);

			commitTimersRef.current[targetSide] = setTimeout(() => commitDraft(targetSide), 1500);
		},
		[commitDraft],
	);

	const handleInputDelta = useCallback((delta: string) => {
		inputDraftRef.current += delta;
		setHeardText(inputDraftRef.current.trim());
		setActivity('hearing');

		if (inputTimerRef.current) clearTimeout(inputTimerRef.current);
		inputTimerRef.current = setTimeout(() => {
			inputDraftRef.current = '';
			setActivity('listening');
		}, 1400);
	}, []);

	const handleOutputDelta = useCallback(
		(targetSide: SideKey, delta: string) => {
			draftSourceSideRef.current[targetSide] = activeSpeakerRef.current;
			const existingDraft = draftTextRef.current[targetSide];
			const nextText = existingDraft ? existingDraft + delta : delta;
			draftTextRef.current[targetSide] = nextText;
			setLiveText((current) => ({ ...current, [targetSide]: nextText.trim() }));
			setActivity('speaking');
			scheduleCommit(targetSide);
		},
		[scheduleCommit],
	);

	const handleRealtimeEvent = useCallback(
		(targetSide: SideKey, shouldCaptureInput: boolean, event: RealtimeEvent) => {
			switch (event.type) {
				case 'session.created':
				case 'session.updated':
					setActivity('listening');
					break;

				case 'session.input_transcript.delta':
					if (shouldCaptureInput && event.delta) handleInputDelta(event.delta);
					break;

				case 'session.output_transcript.delta':
					if (targetSide === audibleSideRef.current && event.delta)
						handleOutputDelta(targetSide, event.delta);
					break;

				case 'session.output_transcript.done':
					if (targetSide !== audibleSideRef.current) return;
					if (event.text || event.transcript) {
						const finalText = event.text ?? event.transcript ?? '';
						draftSourceSideRef.current[targetSide] = activeSpeakerRef.current;
						draftTextRef.current[targetSide] = finalText;
						setLiveText((current) => ({ ...current, [targetSide]: finalText.trim() }));
					}
					commitDraft(targetSide);
					break;

				case 'error':
					setError(event.error?.message ?? 'The translator hit a realtime error.');
					setStatus('error');
					setActivity('quiet');
					break;
			}
		},
		[commitDraft, handleInputDelta, handleOutputDelta],
	);

	const cleanupSession = useCallback(() => {
		Object.values(commitTimersRef.current).forEach((timer) => timer && clearTimeout(timer));
		commitTimersRef.current = {};

		if (inputTimerRef.current) clearTimeout(inputTimerRef.current);
		inputTimerRef.current = null;
		inputDraftRef.current = '';

		channelsRef.current.forEach(({ audio, peerConnection }) => {
			audio.pause();
			audio.srcObject = null;
			peerConnection.close();
		});
		channelsRef.current = [];

		mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
		mediaStreamRef.current = null;
		draftTextRef.current = { a: '', b: '' };
	}, []);

	const stopSession = useCallback(() => {
		cleanupSession();
		setStatus('idle');
		setActivity('quiet');
	}, [cleanupSession]);

	useEffect(() => cleanupSession, [cleanupSession]);

	const openLanguageSetup = useCallback(() => {
		stopSession();
		setStatus('setup');
		setError(null);
	}, [stopSession]);

	const startSession = useCallback(async () => {
		if (isBusy || isLive) return;

		if (languagePair.a === languagePair.b) {
			setStatus('setup');
			setError('Choose two different languages first.');
			return;
		}

		cleanupSession();
		setError(null);
		setHeardText('');
		setLiveText({ a: '', b: '' });
		setStatus('starting');
		setActivity('quiet');

		try {
			if (!navigator.mediaDevices?.getUserMedia) {
				throw new Error('This browser does not expose microphone access.');
			}

			const stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true,
				},
			});

			mediaStreamRef.current = stream;
			setStatus('connecting');

			const pair = languagePairRef.current;
			const nextAudibleSide = audibleSideRef.current;
			const channels = await Promise.all([
				openTranslationChannel({
					sourceStream: stream,
					targetLanguage: pair.a,
					targetSide: 'a',
					isAudible: nextAudibleSide === 'a',
					shouldCaptureInput: true,
					onEvent: handleRealtimeEvent,
				}),
				openTranslationChannel({
					sourceStream: stream,
					targetLanguage: pair.b,
					targetSide: 'b',
					isAudible: nextAudibleSide === 'b',
					shouldCaptureInput: false,
					onEvent: handleRealtimeEvent,
				}),
			]);

			channelsRef.current = channels;
			syncChannelAudio(channels, nextAudibleSide);
			setStatus('live');
			setActivity('listening');
		} catch (error) {
			cleanupSession();
			setStatus('error');
			setActivity('quiet');
			setError(error instanceof Error ? error.message : 'Could not start the translator.');
		}
	}, [cleanupSession, handleRealtimeEvent, isBusy, isLive, languagePair]);

	if (status === 'setup') {
		return (
			<main className="min-h-dvh bg-background px-4 py-5 text-foreground">
				<div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-md flex-col justify-between">
					<div className="pt-6">
						<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
							<Languages className="size-4 text-primary" />
							Live Translate
						</div>
						<h1 className="mt-4 text-4xl font-semibold leading-none tracking-normal">Live Translate</h1>
					</div>

					<div className="grid gap-4 py-8">
						<LanguagePicker
							side="a"
							language={sideA}
							value={languagePair.a}
							onChange={(value) => updateLanguage('a', value)}
						/>

						<Button
							type="button"
							variant="outline"
							className="mx-auto size-12 rounded-full"
							onClick={swapLanguages}
							aria-label="Swap languages"
						>
							<ArrowLeftRight className="size-5 rotate-90" />
						</Button>

						<LanguagePicker
							side="b"
							language={sideB}
							value={languagePair.b}
							onChange={(value) => updateLanguage('b', value)}
						/>
					</div>

					<div className="space-y-3 pb-2">
						{error && (
							<div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm text-destructive">
								{error}
							</div>
						)}
						<Button
							type="button"
							size="lg"
							className="h-16 w-full rounded-lg text-lg font-semibold"
							onClick={startSession}
							disabled={isBusy}
						>
							{isBusy ? <Loader2 className="size-6 animate-spin" /> : <Mic className="size-6" />}
							Start
						</Button>
					</div>
				</div>
			</main>
		);
	}

	return (
		<main className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
			<header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-3">
				<div className="flex min-w-0 items-center gap-2">
					<span className={cn('size-2.5 rounded-full', isLive ? 'bg-primary' : 'bg-muted-foreground')} />
					<span className="truncate text-sm font-medium">{topStatusLabel(status, activity)}</span>
				</div>
				<div className="flex items-center gap-1">
					<HistorySheet history={history} languages={languagePair} />
					<Button type="button" variant="ghost" size="sm" onClick={openLanguageSetup}>
						<Languages className="size-4" />
						Languages
					</Button>
				</div>
			</header>

			<section className="grid min-h-0 flex-1 grid-rows-2">
				<TranslationPanel
					className="rotate-180 border-t border-border bg-card"
					language={sideB}
					side="b"
					text={liveText.b}
					isLive={isLive}
					isActiveSpeaker={activeSpeaker === 'b'}
					onSelectSpeaker={() => setActiveSpeaker('b')}
				/>
				<TranslationPanel
					className="border-t border-border bg-background"
					language={sideA}
					side="a"
					text={liveText.a}
					isLive={isLive}
					isActiveSpeaker={activeSpeaker === 'a'}
					onSelectSpeaker={() => setActiveSpeaker('a')}
				/>
			</section>

			<footer className="shrink-0 border-t border-border bg-background p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
				<div className="mx-auto grid w-full max-w-xl grid-cols-[1fr_auto] gap-3">
					<SpeakerToggle activeSpeaker={activeSpeaker} languages={languagePair} onChange={setActiveSpeaker} />
					<Button
						type="button"
						size="lg"
						variant={isLive ? 'destructive' : 'default'}
						className="h-16 w-32 shrink-0 rounded-lg text-lg font-semibold"
						onClick={isLive || isBusy ? stopSession : startSession}
					>
						{isBusy ? (
							<Loader2 className="size-6 animate-spin" />
						) : isLive ? (
							<MicOff className="size-6" />
						) : (
							<Mic className="size-6" />
						)}
						{isLive || isBusy ? 'Stop' : 'Start'}
					</Button>
				</div>

				<div className="mx-auto mt-2 max-w-xl truncate text-sm text-muted-foreground">
					{heardText || idlePrompt(status, audibleSide)}
				</div>

				{error && (
					<div className="mx-auto mt-2 max-w-xl rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
						{error}
					</div>
				)}
			</footer>
		</main>
	);
}

function LanguagePicker({
	side,
	language,
	value,
	onChange,
}: {
	side: SideKey;
	language: LanguageOption;
	value: LanguageCode;
	onChange: (value: LanguageCode) => void;
}) {
	return (
		<div className="grid gap-2">
			<div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
				<span>{side.toUpperCase()}</span>
				<span>{language.shortLabel}</span>
			</div>
			<Select value={value} onValueChange={(nextValue) => onChange(nextValue as LanguageCode)}>
				<SelectTrigger className="h-16 rounded-lg border-border bg-card px-4 text-xl font-semibold">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{languages.map((option) => (
						<SelectItem key={option.code} value={option.code} className="text-base">
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}

function TranslationPanel({
	className,
	language,
	side,
	text,
	isLive,
	isActiveSpeaker,
	onSelectSpeaker,
}: {
	className?: string;
	language: LanguageOption;
	side: SideKey;
	text: string;
	isLive: boolean;
	isActiveSpeaker: boolean;
	onSelectSpeaker: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onSelectSpeaker}
			className={cn(
				'flex min-h-0 flex-col justify-between p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
				isActiveSpeaker && 'ring-2 ring-inset ring-primary',
				className,
			)}
		>
			<div className="flex items-center justify-between gap-3">
				<div className="min-w-0">
					<div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
						<span
							className={cn(
								'size-2.5 rounded-full',
								isActiveSpeaker ? 'bg-primary' : 'bg-muted-foreground',
							)}
						/>
						{side.toUpperCase()}
					</div>
					<h2 className="mt-1 truncate text-2xl font-semibold tracking-normal">{language.label}</h2>
				</div>
				<Volume2 className={cn('size-7 shrink-0', isLive ? 'text-primary' : 'text-muted-foreground')} />
			</div>

			<div className="flex min-h-0 flex-1 items-center py-4">
				{text ? (
					<p className="w-full text-balance text-4xl font-semibold leading-tight tracking-normal sm:text-6xl">
						{text}
					</p>
				) : (
					<div className="flex w-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
						<Waves className={cn('size-10', isLive && 'animate-pulse text-primary')} />
						<p className="text-lg font-medium">{isLive ? 'Listening' : 'Ready'}</p>
					</div>
				)}
			</div>

			<div className="text-right text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
				{language.shortLabel}
			</div>
		</button>
	);
}

function SpeakerToggle({
	activeSpeaker,
	languages,
	onChange,
}: {
	activeSpeaker: SideKey;
	languages: Record<SideKey, LanguageCode>;
	onChange: (side: SideKey) => void;
}) {
	return (
		<div className="grid h-16 grid-cols-2 rounded-lg border border-border bg-muted p-1">
			{(['a', 'b'] as const).map((side) => (
				<button
					key={side}
					type="button"
					onClick={() => onChange(side)}
					className={cn(
						'min-w-0 rounded-md px-3 text-left text-sm font-semibold transition',
						activeSpeaker === side
							? 'bg-background text-foreground shadow-sm'
							: 'text-muted-foreground hover:text-foreground',
					)}
				>
					<span className="block text-[0.65rem] uppercase tracking-[0.18em]">{side}</span>
					<span className="block truncate">{languageByCode[languages[side]].label}</span>
				</button>
			))}
		</div>
	);
}

function HistorySheet({
	history,
	languages,
}: {
	history: TranscriptEntry[];
	languages: Record<SideKey, LanguageCode>;
}) {
	return (
		<Sheet>
			<SheetTrigger asChild>
				<Button type="button" variant="ghost" size="sm">
					<History className="size-4" />
					History
				</Button>
			</SheetTrigger>
			<SheetContent side="bottom" className="max-h-[75dvh] overflow-y-auto rounded-t-xl">
				<SheetHeader>
					<SheetTitle>History</SheetTitle>
					<SheetDescription className="sr-only">Translated messages from this session.</SheetDescription>
				</SheetHeader>
				<div className="mt-5 grid gap-3">
					{history.length ? (
						history.map((entry) => (
							<div
								key={entry.id}
								className="rounded-lg border border-border bg-card p-3 text-card-foreground"
							>
								<div className="mb-2 flex items-center justify-between gap-3 text-xs font-medium text-muted-foreground">
									<span>
										{languageByCode[languages[entry.sourceSide]].shortLabel}
										{' to '}
										{languageByCode[languages[entry.targetSide]].shortLabel}
									</span>
									<span>{entry.time}</span>
								</div>
								<p className="text-base leading-6">{entry.text}</p>
							</div>
						))
					) : (
						<div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
							No history yet
						</div>
					)}
				</div>
			</SheetContent>
		</Sheet>
	);
}

async function openTranslationChannel({
	sourceStream,
	targetLanguage,
	targetSide,
	isAudible,
	shouldCaptureInput,
	onEvent,
}: {
	sourceStream: MediaStream;
	targetLanguage: LanguageCode;
	targetSide: SideKey;
	isAudible: boolean;
	shouldCaptureInput: boolean;
	onEvent: (targetSide: SideKey, shouldCaptureInput: boolean, event: RealtimeEvent) => void;
}): Promise<TranslationChannel> {
	const sessionResponse = await fetch(apiRoute, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ targetLanguage }),
	});

	const session = (await sessionResponse.json().catch(() => null)) as SecretResponse | null;

	if (!sessionResponse.ok) {
		throw new Error(session?.error ?? `Could not start ${languageByCode[targetLanguage].label}.`);
	}

	const clientSecret = extractClientSecret(session);

	if (!clientSecret) {
		throw new Error(`OpenAI did not return a client secret for ${languageByCode[targetLanguage].label}.`);
	}

	const peerConnection = new RTCPeerConnection();
	const events = peerConnection.createDataChannel('oai-events');
	const audio = new Audio();
	audio.autoplay = true;
	audio.muted = !isAudible;

	peerConnection.ontrack = ({ streams }) => {
		audio.srcObject = streams[0] ?? null;
		void audio.play().catch(() => {
			onEvent(targetSide, shouldCaptureInput, {
				type: 'error',
				error: { message: 'Tap Start again if the browser blocks translated audio.' },
			});
		});
	};

	events.onmessage = ({ data }) => {
		try {
			onEvent(targetSide, shouldCaptureInput, JSON.parse(String(data)));
		} catch {
			console.warn('Unknown realtime translation message:', data);
		}
	};

	events.onerror = () => {
		onEvent(targetSide, shouldCaptureInput, {
			type: 'error',
			error: { message: `The ${languageByCode[targetLanguage].label} translation channel had a problem.` },
		});
	};

	sourceStream.getAudioTracks().forEach((track) => {
		peerConnection.addTrack(track, sourceStream);
	});

	const offer = await peerConnection.createOffer();
	await peerConnection.setLocalDescription(offer);

	const sdpResponse = await fetch(translationCallsUrl, {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${clientSecret}`,
			'Content-Type': 'application/sdp',
		},
		body: offer.sdp ?? '',
	});

	if (!sdpResponse.ok) {
		const body = await sdpResponse.text();
		throw new Error(body || `Could not connect ${languageByCode[targetLanguage].label} translation.`);
	}

	await peerConnection.setRemoteDescription({
		type: 'answer',
		sdp: await sdpResponse.text(),
	});

	return { audio, peerConnection, targetSide };
}

function extractClientSecret(session: SecretResponse | null) {
	if (!session) return null;
	if (typeof session.clientSecret === 'string') return session.clientSecret;
	if (typeof session.value === 'string') return session.value;
	if (typeof session.client_secret === 'string') return session.client_secret;
	return session.client_secret?.value ?? null;
}

function syncChannelAudio(channels: TranslationChannel[], audibleSide: SideKey) {
	channels.forEach((channel) => {
		channel.audio.muted = channel.targetSide !== audibleSide;
	});
}

function oppositeSide(side: SideKey): SideKey {
	return side === 'a' ? 'b' : 'a';
}

function firstDifferentLanguage(language: LanguageCode) {
	return languages.find((option) => option.code !== language)?.code ?? 'en';
}

function topStatusLabel(status: ConnectionStatus, activity: Activity) {
	if (status === 'starting') return 'Opening microphone';
	if (status === 'connecting') return 'Connecting translations';
	if (status === 'error') return 'Stopped';
	if (status === 'live') {
		if (activity === 'speaking') return 'Speaking';
		if (activity === 'hearing') return 'Hearing';
		return 'Live';
	}
	return 'Ready';
}

function idlePrompt(status: ConnectionStatus, audibleSide: SideKey) {
	if (status === 'starting') return 'Opening microphone';
	if (status === 'connecting') return 'Connecting';
	if (status === 'error') return 'Stopped';
	return `Audio plays on ${audibleSide.toUpperCase()}`;
}

function createTranscriptId() {
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
	return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
