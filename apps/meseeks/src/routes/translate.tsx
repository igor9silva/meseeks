import { createFileRoute } from '@tanstack/react-router';
import { track } from '@vercel/analytics/react';
import { Button } from '@reactor/ui/button';
import { cn } from '@reactor/ui/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@reactor/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@reactor/ui/sheet';
import { ArrowLeftRight, History, Languages, Loader2, Mic, MicOff, VolumeX, Waves } from 'lucide-react';
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

interface TranscriptRound {
	id: string;
	heardText: string;
	outputs: Record<SideKey, string>;
	languages: Record<SideKey, LanguageCode>;
	time: string;
}

interface RoundDraft {
	heardText: string;
	outputs: Record<SideKey, string>;
	languages: Record<SideKey, LanguageCode>;
}

const apiRoute = '/api/translate/session';
const translationCallsUrl = 'https://api.openai.com/v1/realtime/translations/calls';
const roundSettleMs = 3000;

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
	const [languagePair, setLanguagePair] = useState<Record<SideKey, LanguageCode>>({ a: 'pt', b: 'en' });
	const [voiceTargetSide, setVoiceTargetSide] = useState<SideKey | null>(null);
	const [status, setStatus] = useState<ConnectionStatus>('setup');
	const [activity, setActivity] = useState<Activity>('quiet');
	const [error, setError] = useState<string | null>(null);
	const [heardText, setHeardText] = useState('');
	const [liveText, setLiveText] = useState<Record<SideKey, string>>({ a: '', b: '' });
	const [history, setHistory] = useState<TranscriptRound[]>([]);

	const channelsRef = useRef<TranslationChannel[]>([]);
	const mediaStreamRef = useRef<MediaStream | null>(null);
	const roundDraftRef = useRef<RoundDraft>(createRoundDraft(languagePair));
	const roundCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const languagePairRef = useRef(languagePair);
	const voiceTargetSideRef = useRef<SideKey | null>(voiceTargetSide);

	const sideA = languageByCode[languagePair.a];
	const sideB = languageByCode[languagePair.b];
	const isBusy = status === 'starting' || status === 'connecting';
	const isLive = status === 'live';

	useEffect(() => {
		languagePairRef.current = languagePair;
	}, [languagePair]);

	useEffect(() => {
		voiceTargetSideRef.current = voiceTargetSide;
		syncChannelAudio(channelsRef.current, voiceTargetSide);
	}, [voiceTargetSide]);

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

	const commitRound = useCallback(() => {
		if (roundCommitTimerRef.current) clearTimeout(roundCommitTimerRef.current);
		roundCommitTimerRef.current = null;

		const draft = roundDraftRef.current;
		const heardText = draft.heardText.trim();
		const outputs = {
			a: draft.outputs.a.trim(),
			b: draft.outputs.b.trim(),
		};

		if (heardText || outputs.a || outputs.b) {
			setHistory((current) =>
				[
					...current,
					{
						id: createTranscriptId(),
						heardText,
						outputs,
						languages: draft.languages,
						time: new Date().toLocaleTimeString('en', {
							hour: '2-digit',
							minute: '2-digit',
						}),
					},
				].slice(-30),
			);
		}

		roundDraftRef.current = createRoundDraft(languagePairRef.current);
		setActivity('listening');
	}, []);

	const beginRound = useCallback(() => {
		const draft = roundDraftRef.current;
		if (hasRoundContent(draft)) return draft;

		draft.languages = { ...languagePairRef.current };
		setHeardText('');
		setLiveText({ a: '', b: '' });
		return draft;
	}, []);

	const scheduleRoundCommit = useCallback(() => {
		if (roundCommitTimerRef.current) clearTimeout(roundCommitTimerRef.current);
		roundCommitTimerRef.current = setTimeout(commitRound, roundSettleMs);
	}, [commitRound]);

	const handleInputDelta = useCallback(
		(delta: string) => {
			const draft = beginRound();
			draft.heardText += delta;
			const nextInput = draft.heardText.trim();
			setHeardText(nextInput);
			setActivity('hearing');

			scheduleRoundCommit();
		},
		[beginRound, scheduleRoundCommit],
	);

	const handleOutputDelta = useCallback(
		(targetSide: SideKey, delta: string) => {
			const draft = beginRound();
			const existingDraft = draft.outputs[targetSide];
			const nextText = existingDraft ? existingDraft + delta : delta;
			draft.outputs[targetSide] = nextText;
			setLiveText((current) => ({ ...current, [targetSide]: nextText.trim() }));
			setActivity('speaking');
			scheduleRoundCommit();
		},
		[beginRound, scheduleRoundCommit],
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
						const draft = beginRound();
						draft.outputs[targetSide] = finalText;
						setLiveText((current) => ({ ...current, [targetSide]: finalText.trim() }));
					}
					scheduleRoundCommit();
					break;

				case 'error':
					setError(event.error?.message ?? 'The translator hit a realtime error.');
					setStatus('error');
					setActivity('quiet');
					break;
			}
		},
		[beginRound, handleInputDelta, handleOutputDelta, scheduleRoundCommit],
	);

	const cleanupSession = useCallback(() => {
		if (roundCommitTimerRef.current) clearTimeout(roundCommitTimerRef.current);
		roundCommitTimerRef.current = null;

		channelsRef.current.forEach(({ audio, peerConnection }) => {
			audio.pause();
			audio.srcObject = null;
			peerConnection.close();
		});
		channelsRef.current = [];

		mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
		mediaStreamRef.current = null;
		roundDraftRef.current = createRoundDraft(languagePairRef.current);
	}, []);

	const stopSession = useCallback(() => {
		commitRound();
		cleanupSession();
		setStatus('idle');
		setActivity('quiet');
	}, [cleanupSession, commitRound]);

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
			const channels = await Promise.all([
				openTranslationChannel({
					sourceStream: stream,
					targetLanguage: pair.a,
					targetSide: 'a',
					isAudible: false,
					shouldCaptureInput: true,
					onEvent: handleRealtimeEvent,
				}),
				openTranslationChannel({
					sourceStream: stream,
					targetLanguage: pair.b,
					targetSide: 'b',
					isAudible: false,
					shouldCaptureInput: false,
					onEvent: handleRealtimeEvent,
				}),
			]);

			channelsRef.current = channels;
			syncChannelAudio(channels, voiceTargetSideRef.current);
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
			<main className="h-full bg-background px-4 py-5 text-foreground">
				<div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-between">
					<div className="pt-6">
						<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
							<Languages className="size-4 text-primary" />
							Live Translate
						</div>
						<h1 className="mt-4 text-4xl font-semibold leading-none tracking-normal">Live Translate</h1>
					</div>

					<div className="grid py-8">
						<LanguagePicker value={languagePair.a} onChange={(value) => updateLanguage('a', value)} />

						<div className="flex justify-center py-4">
							<Button
								type="button"
								variant="outline"
								className="size-12 rounded-full bg-background shadow-sm"
								onClick={swapLanguages}
								aria-label="Swap languages"
							>
								<ArrowLeftRight className="size-5 rotate-90" />
							</Button>
						</div>

						<LanguagePicker value={languagePair.b} onChange={(value) => updateLanguage('b', value)} />
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
		<main className="flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground">
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
					text={liveText.b || heardText}
					isLive={isLive}
					isVoiceTarget={voiceTargetSide === 'b'}
				/>
				<TranslationPanel
					className="border-t border-border bg-background"
					language={sideA}
					text={liveText.a || heardText}
					isLive={isLive}
					isVoiceTarget={voiceTargetSide === 'a'}
				/>
			</section>

			<footer className="shrink-0 border-t border-border bg-background p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
				<div className="mx-auto grid w-full max-w-xl grid-cols-[minmax(9.25rem,auto)_1fr] gap-3">
					<div
						className="grid h-16 grid-cols-3 rounded-lg border border-border bg-muted p-1"
						aria-label="Voice output"
					>
						<button
							type="button"
							className={cn(
								'grid min-w-0 place-items-center rounded-md text-sm font-semibold transition',
								voiceTargetSide === null
									? 'bg-background text-foreground shadow-sm'
									: 'text-muted-foreground hover:text-foreground',
							)}
							onClick={() => setVoiceTargetSide(null)}
							aria-label="Mute voice"
							aria-pressed={voiceTargetSide === null}
						>
							<VolumeX className="size-5" />
						</button>
						{(['a', 'b'] as const).map((side) => (
							<button
								key={side}
								type="button"
								className={cn(
									'min-w-0 rounded-md px-2 text-sm font-semibold transition',
									voiceTargetSide === side
										? 'bg-background text-foreground shadow-sm'
										: 'text-muted-foreground hover:text-foreground',
								)}
								onClick={() => setVoiceTargetSide(side)}
								aria-label={`Speak ${languageByCode[languagePair[side]].label}`}
								aria-pressed={voiceTargetSide === side}
							>
								{languageByCode[languagePair[side]].shortLabel}
							</button>
						))}
					</div>
					<Button
						type="button"
						size="lg"
						variant={isLive ? 'destructive' : 'default'}
						className="h-16 rounded-lg text-lg font-semibold"
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
					{heardText || idlePrompt(status, voiceTargetSide, languagePair)}
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

function LanguagePicker({ value, onChange }: { value: LanguageCode; onChange: (value: LanguageCode) => void }) {
	return (
		<div>
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
	text,
	isLive,
	isVoiceTarget,
}: {
	className?: string;
	language: LanguageOption;
	text: string;
	isLive: boolean;
	isVoiceTarget: boolean;
}) {
	const scrollRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const node = scrollRef.current;
		if (!node) return;
		node.scrollTop = node.scrollHeight;
	}, [text]);

	return (
		<section
			className={cn(
				'flex min-h-0 flex-col overflow-hidden p-4 text-left transition',
				isVoiceTarget && 'ring-2 ring-inset ring-primary',
				className,
			)}
		>
			<div className="flex shrink-0 items-center gap-2 text-lg font-semibold tracking-normal">
				<span className={cn('size-2.5 rounded-full', isVoiceTarget ? 'bg-primary' : 'bg-muted-foreground')} />
				<span className="truncate">{language.label}</span>
			</div>

			<div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-3 pr-1">
				{text ? (
					<p className="whitespace-pre-wrap break-words text-4xl font-semibold leading-tight tracking-normal sm:text-6xl">
						{text}
					</p>
				) : (
					<div className="flex min-h-full w-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
						<Waves className={cn('size-10', isLive && 'animate-pulse text-primary')} />
						<p className="text-lg font-medium">{isLive ? 'Listening' : 'Ready'}</p>
					</div>
				)}
			</div>
		</section>
	);
}

function HistorySheet({
	history,
	languages,
}: {
	history: TranscriptRound[];
	languages: Record<SideKey, LanguageCode>;
}) {
	const [isOpen, setIsOpen] = useState(false);
	const scrollRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!isOpen) return;

		const scrollToBottom = () => {
			const node = scrollRef.current;
			if (!node) return;
			node.scrollTop = node.scrollHeight;
		};

		scrollToBottom();
		const timeout = setTimeout(scrollToBottom, 50);
		return () => clearTimeout(timeout);
	}, [isOpen]);

	return (
		<Sheet open={isOpen} onOpenChange={setIsOpen}>
			<SheetTrigger asChild>
				<Button type="button" variant="ghost" size="sm">
					<History className="size-4" />
					History
				</Button>
			</SheetTrigger>
			<SheetContent side="bottom" className="flex max-h-[75dvh] flex-col overflow-hidden rounded-t-xl">
				<SheetHeader>
					<SheetTitle>History</SheetTitle>
					<SheetDescription className="sr-only">Translated rounds from this session.</SheetDescription>
				</SheetHeader>
				<div ref={scrollRef} className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
					{history.length ? (
						<div className="flex flex-col gap-2 pb-1">
							{history.map((round) => (
								<div key={round.id} className="flex justify-center">
									<div className="w-full rounded-lg border border-border bg-card px-2 py-2 shadow-sm">
										<div className="grid gap-1.5">
											{(['a', 'b'] as const).map((side) => {
												const text = round.outputs[side] || round.heardText;
												if (!text) return null;

												return (
													<div
														key={side}
														className={cn(
															'grid grid-cols-[2.25rem_1fr] gap-1 rounded-md px-2 py-2',
															side === 'a'
																? 'bg-primary text-primary-foreground'
																: 'bg-muted/70 text-foreground',
														)}
													>
														<div
															className={cn(
																'pt-1 text-xs font-semibold',
																side === 'a'
																	? 'text-primary-foreground/70'
																	: 'text-muted-foreground',
															)}
														>
															{languageByCode[round.languages[side]]?.shortLabel ??
																languageByCode[languages[side]].shortLabel}
														</div>
														<p className="whitespace-pre-wrap break-words text-base leading-6">
															{text}
														</p>
													</div>
												);
											})}
										</div>
									</div>
								</div>
							))}
						</div>
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

function syncChannelAudio(channels: TranslationChannel[], targetSide: SideKey | null) {
	channels.forEach((channel) => {
		channel.audio.muted = channel.targetSide !== targetSide;
	});
}

function createRoundDraft(languages: Record<SideKey, LanguageCode>): RoundDraft {
	return {
		heardText: '',
		outputs: { a: '', b: '' },
		languages: { ...languages },
	};
}

function hasRoundContent(draft: RoundDraft) {
	return Boolean(draft.heardText.trim() || draft.outputs.a.trim() || draft.outputs.b.trim());
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

function idlePrompt(
	status: ConnectionStatus,
	voiceTargetSide: SideKey | null,
	languages: Record<SideKey, LanguageCode>,
) {
	if (status === 'starting') return 'Opening microphone';
	if (status === 'connecting') return 'Connecting';
	if (status === 'error') return 'Stopped';
	if (!voiceTargetSide) return 'Voice muted';

	return `Voice: ${languageByCode[languages[voiceTargetSide]].shortLabel}`;
}

function createTranscriptId() {
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
	return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
