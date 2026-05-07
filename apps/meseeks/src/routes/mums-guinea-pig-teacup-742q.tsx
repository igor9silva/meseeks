import { createFileRoute } from '@tanstack/react-router';
import { track } from '@vercel/analytics/react';
import { Badge } from '@reactor/ui/badge';
import { Button } from '@reactor/ui/button';
import { cn } from '@reactor/ui/lib/utils';
import {
	Heart,
	Languages,
	Loader2,
	MessageCircleHeart,
	Mic,
	PhoneCall,
	PhoneOff,
	RefreshCw,
	Sparkles,
	Volume2,
	Waves,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

type TargetKey = 'english' | 'mandarin' | 'portuguese';
type ConnectionStatus = 'idle' | 'starting' | 'connecting' | 'live' | 'error';
type Activity = 'quiet' | 'asking' | 'listening' | 'thinking' | 'speaking';
type TranscriptKind = 'heard' | 'translated';

interface TranscriptEntry {
	id: string;
	kind: TranscriptKind;
	text: string;
	label: string;
	time: string;
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

const routeSlug = 'mums-guinea-pig-teacup-742q';
const apiRoute = `/api/${routeSlug}/session`;

const targetOptions: Record<
	TargetKey,
	{
		label: string;
		shortLabel: string;
		description: string;
		language: string;
		accent: string;
	}
> = {
	english: {
		label: 'British English',
		shortLabel: 'English',
		description: 'For the British friend',
		language: 'British English',
		accent: 'bg-[#d94f45]',
	},
	mandarin: {
		label: 'Mandarin Chinese',
		shortLabel: 'Chinese',
		description: 'For the Chinese friend',
		language: 'Mandarin Chinese',
		accent: 'bg-[#0f9f8f]',
	},
	portuguese: {
		label: 'Portuguese',
		shortLabel: 'Mum',
		description: 'Back to Mum',
		language: 'Portuguese',
		accent: 'bg-[#6f5bd8]',
	},
};

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
	const [targetKey, setTargetKey] = useState<TargetKey>('english');
	const [status, setStatus] = useState<ConnectionStatus>('idle');
	const [activity, setActivity] = useState<Activity>('quiet');
	const [error, setError] = useState<string | null>(null);
	const [liveTranslation, setLiveTranslation] = useState('');
	const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);

	const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
	const dataChannelRef = useRef<RTCDataChannel | null>(null);
	const mediaStreamRef = useRef<MediaStream | null>(null);
	const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
	const liveTranslationRef = useRef('');
	const targetKeyRef = useRef<TargetKey>(targetKey);

	const target = targetOptions[targetKey];
	const isBusy = status === 'starting' || status === 'connecting';
	const isLive = status === 'live';

	useEffect(() => {
		track('mum-translator', {
			status,
			target: targetKey,
		});
	}, [status, targetKey]);

	useEffect(() => {
		targetKeyRef.current = targetKey;
	}, [targetKey]);

	const addTranscriptEntry = useCallback((kind: TranscriptKind, text: string, label: string) => {
		const normalizedText = text.trim();
		if (!normalizedText) return;

		setTranscript((current) =>
			[
				{
					id: createTranscriptId(),
					kind,
					text: normalizedText,
					label,
					time: new Date().toLocaleTimeString('en', {
						hour: '2-digit',
						minute: '2-digit',
					}),
				},
				...current,
			].slice(0, 8),
		);
	}, []);

	const commitLiveTranslation = useCallback(
		(text?: string) => {
			const finalText = text?.trim() || liveTranslationRef.current.trim();
			liveTranslationRef.current = '';
			setLiveTranslation('');
			if (finalText) addTranscriptEntry('translated', finalText, targetOptions[targetKeyRef.current].label);
		},
		[addTranscriptEntry],
	);

	const handleRealtimeEvent = useCallback(
		(event: RealtimeEvent) => {
			switch (event.type) {
				case 'session.created':
				case 'session.updated':
					setStatus('live');
					setActivity('listening');
					break;

				case 'input_audio_buffer.speech_started':
					setActivity('listening');
					break;

				case 'input_audio_buffer.speech_stopped':
				case 'response.created':
					setActivity('thinking');
					break;

				case 'conversation.item.input_audio_transcription.segment':
					if (event.text) addTranscriptEntry('heard', event.text, 'Heard');
					break;

				case 'conversation.item.input_audio_transcription.completed':
					if (event.transcript) addTranscriptEntry('heard', event.transcript, 'Heard');
					break;

				case 'response.output_audio_transcript.delta':
				case 'response.output_text.delta':
					if (event.delta) {
						liveTranslationRef.current += event.delta;
						setLiveTranslation(liveTranslationRef.current);
						setActivity('speaking');
					}
					break;

				case 'response.output_audio_transcript.done':
					commitLiveTranslation(event.transcript);
					setActivity('listening');
					break;

				case 'response.output_text.done':
					commitLiveTranslation(event.text);
					setActivity('listening');
					break;

				case 'response.done':
					commitLiveTranslation();
					setActivity('listening');
					break;

				case 'error':
					setError(event.error?.message ?? 'The translator hit a realtime error.');
					setStatus('error');
					setActivity('quiet');
					break;
			}
		},
		[addTranscriptEntry, commitLiveTranslation],
	);

	const cleanupSession = useCallback(() => {
		dataChannelRef.current?.close();
		dataChannelRef.current = null;

		peerConnectionRef.current?.close();
		peerConnectionRef.current = null;

		mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
		mediaStreamRef.current = null;

		if (remoteAudioRef.current) {
			remoteAudioRef.current.pause();
			remoteAudioRef.current.srcObject = null;
			remoteAudioRef.current = null;
		}

		liveTranslationRef.current = '';
	}, []);

	const stopSession = useCallback(() => {
		cleanupSession();
		setLiveTranslation('');
		setStatus('idle');
		setActivity('quiet');
	}, [cleanupSession]);

	useEffect(() => cleanupSession, [cleanupSession]);

	const startSession = useCallback(async () => {
		if (isBusy || isLive) return;

		cleanupSession();
		setLiveTranslation('');
		setError(null);
		setStatus('starting');
		setActivity('asking');

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

			const peerConnection = new RTCPeerConnection();
			const dataChannel = peerConnection.createDataChannel('oai-events');
			const remoteAudio = document.createElement('audio');

			remoteAudio.autoplay = true;

			peerConnection.ontrack = (event) => {
				remoteAudio.srcObject = event.streams[0] ?? null;
				void remoteAudio.play().catch(() => {
					setError('Tap Start again if the browser blocks audio playback.');
				});
			};

			dataChannel.onopen = () => {
				setStatus('live');
				setActivity('listening');
			};
			dataChannel.onmessage = (messageEvent) => {
				try {
					handleRealtimeEvent(JSON.parse(String(messageEvent.data)));
				} catch {
					console.warn('Unknown realtime message:', messageEvent.data);
				}
			};
			dataChannel.onerror = () => {
				setError('The realtime data channel had a problem.');
			};

			stream.getAudioTracks().forEach((track) => peerConnection.addTrack(track, stream));

			mediaStreamRef.current = stream;
			peerConnectionRef.current = peerConnection;
			dataChannelRef.current = dataChannel;
			remoteAudioRef.current = remoteAudio;

			const offer = await peerConnection.createOffer();
			await peerConnection.setLocalDescription(offer);

			setStatus('connecting');

			const response = await fetch(`${apiRoute}?target=${targetKeyRef.current}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/sdp',
				},
				body: offer.sdp ?? '',
			});

			if (!response.ok) {
				const body = await response.text();
				throw new Error(body || `Could not start translation (${response.status}).`);
			}

			await peerConnection.setRemoteDescription({
				type: 'answer',
				sdp: await response.text(),
			});
		} catch (error) {
			cleanupSession();
			setLiveTranslation('');
			setStatus('error');
			setActivity('quiet');
			setError(error instanceof Error ? error.message : 'Could not start the translator.');
		}
	}, [cleanupSession, handleRealtimeEvent, isBusy, isLive]);

	const updateTarget = useCallback((nextTargetKey: TargetKey) => {
		setTargetKey(nextTargetKey);
		setError(null);

		const dataChannel = dataChannelRef.current;
		if (dataChannel?.readyState !== 'open') return;

		dataChannel.send(
			JSON.stringify({
				type: 'session.update',
				session: {
					type: 'realtime',
					model: 'gpt-realtime-translate',
					output_modalities: ['audio'],
					instructions: createInstructions(targetOptions[nextTargetKey].language),
				},
			}),
		);
	}, []);

	return (
		<div className="min-h-dvh bg-[#fff9f4] text-[#241b18]">
			<div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 py-4 sm:px-6 lg:px-8">
				<header className="flex items-center justify-between gap-3 border-b border-[#eadfd6] pb-3">
					<div className="min-w-0">
						<div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-[#8a5d4d]">
							<Heart className="size-3.5 fill-[#d94f45] text-[#d94f45]" />
							Guinea Pig Tea Bridge
						</div>
						<h1 className="mt-2 text-2xl font-semibold leading-tight sm:text-4xl">
							Mum's Sweet Translator
						</h1>
					</div>
					<Badge className="border-[#ccbdb2] bg-white/70 px-3 py-1 text-[#4a3730]" variant="outline">
						{statusLabel(status)}
					</Badge>
				</header>

				<main className="grid flex-1 gap-4 py-4 lg:grid-cols-[0.92fr_1.08fr] lg:items-stretch">
					<section className="flex min-h-[34rem] flex-col justify-between rounded-lg border border-[#eadfd6] bg-white p-4 shadow-sm sm:p-6">
						<div className="space-y-5">
							<div className="flex items-start gap-3">
								<div className="grid size-11 shrink-0 place-items-center rounded-lg bg-[#fff0eb] text-[#d94f45]">
									<MessageCircleHeart className="size-5" />
								</div>
								<div>
									<h2 className="text-xl font-semibold">For Mum, softly spoken.</h2>
									<p className="mt-1 text-sm leading-6 text-[#6d5b53]">
										Choose who should hear the next translation, then leave the phone between
										everyone.
									</p>
								</div>
							</div>

							<div className="grid gap-2">
								{Object.entries(targetOptions).map(([key, option]) => (
									<button
										key={key}
										type="button"
										aria-pressed={targetKey === key}
										onClick={() => updateTarget(key as TargetKey)}
										className={cn(
											'flex min-h-20 items-center gap-3 rounded-lg border p-3 text-left transition',
											targetKey === key
												? 'border-[#241b18] bg-[#fff7df] shadow-sm'
												: 'border-[#eadfd6] bg-white hover:bg-[#fffaf1]',
										)}
									>
										<span className={cn('size-3 rounded-full', option.accent)} />
										<span className="min-w-0 flex-1">
											<span className="block text-base font-medium">{option.label}</span>
											<span className="block text-sm text-[#75645c]">{option.description}</span>
										</span>
										<Languages className="size-4 shrink-0 text-[#8a5d4d]" />
									</button>
								))}
							</div>
						</div>

						<div className="mt-6 space-y-3">
							<ActivityStrip activity={activity} target={target.shortLabel} />
							<div className="flex gap-2">
								<Button
									type="button"
									size="lg"
									className="h-12 flex-1 rounded-lg bg-[#241b18] text-white hover:bg-[#3a2c26]"
									onClick={startSession}
									disabled={isBusy || isLive}
								>
									{isBusy ? (
										<Loader2 className="size-5 animate-spin" />
									) : (
										<PhoneCall className="size-5" />
									)}
									Start
								</Button>
								<Button
									type="button"
									size="lg"
									variant="outline"
									className="h-12 rounded-lg border-[#ccbdb2] bg-white px-4 text-[#4a3730] hover:bg-[#fff4ea]"
									onClick={stopSession}
									disabled={!isLive && !isBusy && status !== 'error'}
									aria-label="Stop translator"
								>
									<PhoneOff className="size-5" />
								</Button>
							</div>
							{error && (
								<div className="rounded-lg border border-[#f0b7ad] bg-[#fff0ee] px-3 py-2 text-sm text-[#8f3128]">
									{error}
								</div>
							)}
						</div>
					</section>

					<section className="flex min-h-[34rem] flex-col rounded-lg border border-[#dfe5db] bg-[#fbfffb] p-4 shadow-sm sm:p-6">
						<div className="flex items-center justify-between gap-3 border-b border-[#dfe5db] pb-3">
							<div>
								<h2 className="text-lg font-semibold">Now translating to {target.label}</h2>
								<p className="mt-1 text-sm text-[#667064]">
									Live words appear here while the voice plays.
								</p>
							</div>
							<div className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#eaf7ef] text-[#0f7f70]">
								<Volume2 className="size-5" />
							</div>
						</div>

						<div className="flex min-h-36 flex-1 flex-col justify-center py-6">
							{liveTranslation ? (
								<div className="rounded-lg bg-white p-4 text-2xl font-medium leading-snug shadow-sm ring-1 ring-[#dfe5db]">
									{liveTranslation}
								</div>
							) : (
								<div className="flex flex-col items-center justify-center gap-3 text-center text-[#667064]">
									<Waves className={cn('size-9', isLive && 'animate-pulse text-[#0f9f8f]')} />
									<p className="max-w-sm text-sm leading-6">
										{isLive
											? 'Ready for the next sentence.'
											: 'The first translated sentence will land here.'}
									</p>
								</div>
							)}
						</div>

						<div className="border-t border-[#dfe5db] pt-3">
							<div className="mb-2 flex items-center justify-between gap-2">
								<h3 className="text-sm font-medium text-[#455044]">Recent lines</h3>
								<button
									type="button"
									onClick={() => setTranscript([])}
									className="inline-flex size-8 items-center justify-center rounded-lg text-[#667064] hover:bg-[#edf5ed]"
									aria-label="Clear recent lines"
								>
									<RefreshCw className="size-4" />
								</button>
							</div>
							<div className="grid max-h-64 gap-2 overflow-y-auto pr-1">
								{transcript.length > 0 ? (
									transcript.map((entry) => <TranscriptLine key={entry.id} entry={entry} />)
								) : (
									<div className="rounded-lg border border-dashed border-[#cfd9cc] px-3 py-6 text-center text-sm text-[#667064]">
										No lines yet.
									</div>
								)}
							</div>
						</div>
					</section>
				</main>
			</div>
		</div>
	);
}

function ActivityStrip({ activity, target }: { activity: Activity; target: string }) {
	const icon =
		activity === 'speaking' ? Volume2 : activity === 'thinking' ? Sparkles : activity === 'asking' ? Mic : Waves;

	const Icon = icon;

	return (
		<div className="flex min-h-12 items-center gap-3 rounded-lg bg-[#f7efe8] px-3 text-sm text-[#5d4b43]">
			<Icon className={cn('size-4', activity !== 'quiet' && 'animate-pulse text-[#d94f45]')} />
			<span>{activityLabel(activity, target)}</span>
		</div>
	);
}

function TranscriptLine({ entry }: { entry: TranscriptEntry }) {
	return (
		<div
			className={cn(
				'rounded-lg border px-3 py-2 text-sm',
				entry.kind === 'translated' ? 'border-[#cfe1d4] bg-white' : 'border-[#eadfd6] bg-[#fffaf6]',
			)}
		>
			<div className="mb-1 flex items-center justify-between gap-2 text-xs text-[#75645c]">
				<span>{entry.label}</span>
				<time>{entry.time}</time>
			</div>
			<p className="leading-6">{entry.text}</p>
		</div>
	);
}

function createInstructions(language: string) {
	return [
		`Translate every spoken turn into ${language}.`,
		'Only translate what was said. Do not answer as an assistant.',
		'Keep names, places, laughter, and small affectionate phrases natural.',
		'If the speaker pauses or corrects themselves, preserve the corrected meaning.',
		'Use warm, clear phrasing suitable for a family conversation.',
	].join(' ');
}

function statusLabel(status: ConnectionStatus) {
	switch (status) {
		case 'starting':
			return 'Mic';
		case 'connecting':
			return 'Connecting';
		case 'live':
			return 'Live';
		case 'error':
			return 'Needs care';
		default:
			return 'Ready';
	}
}

function activityLabel(activity: Activity, target: string) {
	switch (activity) {
		case 'asking':
			return 'Asking for the microphone.';
		case 'listening':
			return `Listening. Next voice becomes ${target}.`;
		case 'thinking':
			return 'Holding the thought for a moment.';
		case 'speaking':
			return 'Speaking the translation.';
		default:
			return 'Quiet and ready.';
	}
}

function createTranscriptId() {
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
	return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
