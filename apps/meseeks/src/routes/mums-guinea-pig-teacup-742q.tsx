import { createFileRoute } from '@tanstack/react-router';
import { track } from '@vercel/analytics/react';
import { Button } from '@reactor/ui/button';
import { cn } from '@reactor/ui/lib/utils';
import { Heart, Languages, Loader2, Mic, MicOff, Volume2, Waves } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

type LanguageCode = 'en' | 'pt' | 'zh';
type SideKey = 'a' | 'b';
type ConnectionStatus = 'setup' | 'idle' | 'starting' | 'connecting' | 'live' | 'error';
type Activity = 'quiet' | 'listening' | 'hearing' | 'speaking';

interface LanguageOption {
	code: LanguageCode;
	label: string;
	shortLabel: string;
	helper: string;
	accent: string;
}

interface TranslationChannel {
	audio: HTMLAudioElement;
	peerConnection: RTCPeerConnection;
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
	client_secret?: string | { value?: string };
	error?: string;
}

interface TranscriptEntry {
	id: string;
	targetSide: SideKey;
	text: string;
	time: string;
}

const routeSlug = 'mums-guinea-pig-teacup-742q';
const apiRoute = `/api/${routeSlug}/session`;
const translationCallsUrl = 'https://api.openai.com/v1/realtime/translations/calls';

const languages: LanguageOption[] = [
	{
		code: 'pt',
		label: 'Portuguese',
		shortLabel: 'PT',
		helper: 'Mum hears this',
		accent: 'bg-[#d94f45]',
	},
	{
		code: 'zh',
		label: 'Chinese',
		shortLabel: 'ZH',
		helper: 'Chinese friend hears this',
		accent: 'bg-[#0f9f8f]',
	},
	{
		code: 'en',
		label: 'English',
		shortLabel: 'EN',
		helper: 'British friend hears this',
		accent: 'bg-[#4e6edb]',
	},
];

const languageByCode = Object.fromEntries(languages.map((language) => [language.code, language])) as Record<
	LanguageCode,
	LanguageOption
>;

export const Route = createFileRoute('/mums-guinea-pig-teacup-742q')({
	component: RouteComponent,
	head: () => ({
		meta: [
			{ title: "Mum's Sweet Translator" },
			{
				name: 'description',
				content: 'A tiny voice translation bridge for Mum and her friends.',
			},
		],
	}),
});

function RouteComponent() {
	const [mumLanguage, setMumLanguage] = useState<LanguageCode>('pt');
	const [friendLanguage, setFriendLanguage] = useState<LanguageCode>('zh');
	const [status, setStatus] = useState<ConnectionStatus>('setup');
	const [activity, setActivity] = useState<Activity>('quiet');
	const [error, setError] = useState<string | null>(null);
	const [heardText, setHeardText] = useState('');
	const [liveText, setLiveText] = useState<Record<SideKey, string>>({ a: '', b: '' });
	const [history, setHistory] = useState<TranscriptEntry[]>([]);

	const channelsRef = useRef<TranslationChannel[]>([]);
	const mediaStreamRef = useRef<MediaStream | null>(null);
	const draftTextRef = useRef<Record<SideKey, string>>({ a: '', b: '' });
	const inputDraftRef = useRef('');
	const commitTimersRef = useRef<Partial<Record<SideKey, ReturnType<typeof setTimeout>>>>({});
	const inputTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const activeLanguagesRef = useRef({ mumLanguage, friendLanguage });

	const mum = languageByCode[mumLanguage];
	const friend = languageByCode[friendLanguage];
	const isBusy = status === 'starting' || status === 'connecting';
	const isLive = status === 'live';

	useEffect(() => {
		activeLanguagesRef.current = { mumLanguage, friendLanguage };
	}, [mumLanguage, friendLanguage]);

	useEffect(() => {
		track('mum-translator', {
			status,
			mumLanguage,
			friendLanguage,
		});
	}, [status, mumLanguage, friendLanguage]);

	const addHistoryEntry = useCallback((targetSide: SideKey, text: string) => {
		const normalizedText = text.trim();
		if (!normalizedText) return;

		setHistory((current) =>
			[
				{
					id: createTranscriptId(),
					targetSide,
					text: normalizedText,
					time: new Date().toLocaleTimeString('en', {
						hour: '2-digit',
						minute: '2-digit',
					}),
				},
				...current,
			].slice(0, 6),
		);
	}, []);

	const commitDraft = useCallback(
		(targetSide: SideKey) => {
			const finalText = draftTextRef.current[targetSide].trim();
			draftTextRef.current[targetSide] = '';

			if (finalText) addHistoryEntry(targetSide, finalText);
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
					if (event.delta) handleOutputDelta(targetSide, event.delta);
					break;

				case 'session.output_transcript.done':
					if (event.text || event.transcript) {
						const finalText = event.text ?? event.transcript ?? '';
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

		if (mumLanguage === friendLanguage) {
			setStatus('setup');
			setError('Choose two different languages first.');
			return;
		}

		cleanupSession();
		setError(null);
		setHeardText('');
		setLiveText({ a: '', b: '' });
		setHistory([]);
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

			const channels = await Promise.all([
				openTranslationChannel({
					sourceStream: stream,
					targetLanguage: activeLanguagesRef.current.mumLanguage,
					targetSide: 'a',
					shouldCaptureInput: true,
					onEvent: handleRealtimeEvent,
				}),
				openTranslationChannel({
					sourceStream: stream,
					targetLanguage: activeLanguagesRef.current.friendLanguage,
					targetSide: 'b',
					shouldCaptureInput: false,
					onEvent: handleRealtimeEvent,
				}),
			]);

			channelsRef.current = channels;
			setStatus('live');
			setActivity('listening');
		} catch (error) {
			cleanupSession();
			setStatus('error');
			setActivity('quiet');
			setError(error instanceof Error ? error.message : 'Could not start the translator.');
		}
	}, [cleanupSession, handleRealtimeEvent, isBusy, isLive, mumLanguage, friendLanguage]);

	if (status === 'setup') {
		return (
			<main className="min-h-dvh bg-[#fff8f1] px-4 py-5 text-[#241b18]">
				<div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-md flex-col justify-between">
					<div className="pt-5">
						<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8a5d4d]">
							<Heart className="size-4 fill-[#d94f45] text-[#d94f45]" />
							Guinea Pig Tea Bridge
						</div>
						<h1 className="mt-4 text-4xl font-semibold leading-none">Mum's translator</h1>
						<p className="mt-4 text-lg leading-7 text-[#695750]">
							Pick the two languages. Then leave the phone on the table and press start.
						</p>
					</div>

					<div className="grid gap-4 py-8">
						<LanguageSelect
							id="mum-language"
							label="Mum hears"
							value={mumLanguage}
							onChange={setMumLanguage}
						/>
						<LanguageSelect
							id="friend-language"
							label="Friend hears"
							value={friendLanguage}
							onChange={setFriendLanguage}
						/>
					</div>

					<div className="space-y-3 pb-2">
						{error && (
							<div className="rounded-lg border border-[#f0b7ad] bg-[#fff0ee] px-3 py-3 text-sm text-[#8f3128]">
								{error}
							</div>
						)}
						<Button
							type="button"
							size="lg"
							className="h-16 w-full rounded-lg bg-[#241b18] text-lg font-semibold text-white hover:bg-[#3a2c26]"
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
		<main className="flex h-dvh flex-col overflow-hidden bg-[#fff8f1] text-[#241b18]">
			<header className="flex h-14 shrink-0 items-center justify-between border-b border-[#eadfd6] px-3">
				<div className="flex min-w-0 items-center gap-2">
					<span className={cn('size-2.5 rounded-full', isLive ? 'bg-[#0f9f8f]' : 'bg-[#d94f45]')} />
					<span className="truncate text-sm font-medium">{topStatusLabel(status, activity)}</span>
				</div>
				<button
					type="button"
					onClick={openLanguageSetup}
					className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-[#5d4b43] hover:bg-[#f2e7dc]"
				>
					<Languages className="size-4" />
					Languages
				</button>
			</header>

			<section className="grid min-h-0 flex-1 grid-rows-2">
				<TranslationPanel
					className="rotate-180 border-t border-[#d6e7dc] bg-[#f4fff7]"
					language={friend}
					sideLabel="Friend hears"
					text={liveText.b}
					isLive={isLive}
				/>
				<TranslationPanel
					className="border-t border-[#eadfd6] bg-[#fff8f1]"
					language={mum}
					sideLabel="Mum hears"
					text={liveText.a}
					isLive={isLive}
				/>
			</section>

			<footer className="shrink-0 border-t border-[#eadfd6] bg-[#fff8f1] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
				<div className="mx-auto flex w-full max-w-xl items-center gap-3">
					<div className="min-w-0 flex-1">
						<div className="truncate text-sm font-medium text-[#5d4b43]">
							{heardText || idlePrompt(status)}
						</div>
						{history[0] && (
							<div className="mt-0.5 truncate text-xs text-[#8a766d]">
								Last:{' '}
								{languageByCode[history[0].targetSide === 'a' ? mumLanguage : friendLanguage].label} -{' '}
								{history[0].time}
							</div>
						)}
					</div>
					<Button
						type="button"
						size="lg"
						className={cn(
							'h-16 w-36 shrink-0 rounded-lg text-lg font-semibold text-white',
							isLive ? 'bg-[#d94f45] hover:bg-[#b94239]' : 'bg-[#241b18] hover:bg-[#3a2c26]',
						)}
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
				{error && (
					<div className="mx-auto mt-2 max-w-xl rounded-lg border border-[#f0b7ad] bg-[#fff0ee] px-3 py-2 text-sm text-[#8f3128]">
						{error}
					</div>
				)}
			</footer>
		</main>
	);
}

function LanguageSelect({
	id,
	label,
	value,
	onChange,
}: {
	id: string;
	label: string;
	value: LanguageCode;
	onChange: (value: LanguageCode) => void;
}) {
	const selected = languageByCode[value];

	return (
		<label htmlFor={id} className="grid gap-2">
			<span className="text-sm font-medium text-[#5d4b43]">{label}</span>
			<div className="relative">
				<span
					className={cn(
						'pointer-events-none absolute left-4 top-1/2 size-3 -translate-y-1/2 rounded-full',
						selected.accent,
					)}
				/>
				<select
					id={id}
					value={value}
					onChange={(event) => onChange(event.target.value as LanguageCode)}
					className="h-16 w-full appearance-none rounded-lg border border-[#dfd0c4] bg-white px-10 text-xl font-semibold outline-none transition focus:border-[#241b18] focus:ring-2 focus:ring-[#241b18]/10"
				>
					{languages.map((language) => (
						<option key={language.code} value={language.code}>
							{language.label}
						</option>
					))}
				</select>
				<Languages className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-[#8a766d]" />
			</div>
			<span className="text-sm text-[#8a766d]">{selected.helper}</span>
		</label>
	);
}

function TranslationPanel({
	className,
	language,
	sideLabel,
	text,
	isLive,
}: {
	className?: string;
	language: LanguageOption;
	sideLabel: string;
	text: string;
	isLive: boolean;
}) {
	return (
		<div className={cn('flex min-h-0 flex-col justify-between p-4', className)}>
			<div className="flex items-center justify-between gap-3">
				<div className="min-w-0">
					<div className="flex items-center gap-2 text-sm font-medium text-[#5d4b43]">
						<span className={cn('size-2.5 rounded-full', language.accent)} />
						{sideLabel}
					</div>
					<h2 className="mt-1 truncate text-2xl font-semibold">{language.label}</h2>
				</div>
				<Volume2 className={cn('size-7 shrink-0', isLive ? 'text-[#0f9f8f]' : 'text-[#8a766d]')} />
			</div>

			<div className="flex min-h-0 flex-1 items-center py-4">
				{text ? (
					<p className="w-full text-balance text-4xl font-semibold leading-tight tracking-normal sm:text-6xl">
						{text}
					</p>
				) : (
					<div className="flex w-full flex-col items-center justify-center gap-3 text-center text-[#8a766d]">
						<Waves className={cn('size-10', isLive && 'animate-pulse text-[#0f9f8f]')} />
						<p className="text-lg font-medium">{isLive ? 'Listening' : 'Ready'}</p>
					</div>
				)}
			</div>

			<div className="text-right text-sm font-semibold uppercase tracking-[0.18em] text-[#9b8175]">
				{language.shortLabel}
			</div>
		</div>
	);
}

async function openTranslationChannel({
	sourceStream,
	targetLanguage,
	targetSide,
	shouldCaptureInput,
	onEvent,
}: {
	sourceStream: MediaStream;
	targetLanguage: LanguageCode;
	targetSide: SideKey;
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

	return { audio, peerConnection };
}

function extractClientSecret(session: SecretResponse | null) {
	if (!session) return null;
	if (typeof session.client_secret === 'string') return session.client_secret;
	return session.client_secret?.value ?? null;
}

function topStatusLabel(status: ConnectionStatus, activity: Activity) {
	if (status === 'starting') return 'Opening microphone';
	if (status === 'connecting') return 'Connecting translations';
	if (status === 'error') return 'Needs a little help';
	if (status === 'live') {
		if (activity === 'speaking') return 'Speaking translation';
		if (activity === 'hearing') return 'Hearing voice';
		return 'Live on the table';
	}
	return 'Ready';
}

function idlePrompt(status: ConnectionStatus) {
	if (status === 'starting') return 'Opening microphone';
	if (status === 'connecting') return 'Connecting both languages';
	if (status === 'error') return 'Stopped';
	return 'Press Start when both people are ready';
}

function createTranscriptId() {
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
	return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
