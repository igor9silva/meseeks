import { useAction } from 'convex/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { api } from 'convex/_generated/api';

export type ComposerTranscriptStatus = 'idle' | 'connecting' | 'streaming' | 'finalizing';
export type ComposerTranscriptTransport = 'idle' | 'webrtc' | 'fallback';
export type ComposerVadMode = 'server' | 'semantic';
export type ComposerVoiceLatency = 'fast' | 'balanced' | 'accurate';

export type ComposerVoiceTurn = {
	itemId: string;
	previousItemId?: string | null;
	text: string;
	finalText?: string;
	status: 'streaming' | 'final';
	confidence?: number;
	updatedAt: number;
};

type RealtimeEvent = {
	type?: string;
	item_id?: string;
	previous_item_id?: string | null;
	delta?: string;
	transcript?: string;
	text?: string;
	logprobs?: Array<{ logprob?: number }>;
	error?: unknown;
};

type UseComposerTranscriptionProps = {
	promptContext?: string;
	dictionary?: string[];
	language?: string;
	vadMode: ComposerVadMode;
	latency: ComposerVoiceLatency;
	onTranscript: (text: string, turns: ComposerVoiceTurn[]) => void;
	onComplete: (text: string, turns: ComposerVoiceTurn[]) => void;
	onCancel: () => void;
};

const realtimeFinishWaitMs = 1200;

export function useComposerTranscription({
	promptContext,
	dictionary,
	language,
	vadMode,
	latency,
	onTranscript,
	onComplete,
	onCancel,
}: UseComposerTranscriptionProps) {
	const createRealtimeCall = useAction(api.magicRock.createRealtimeTranscriptionCall);
	const transcribeAction = useAction(api.magicRock.transcribe);

	const streamRef = useRef<MediaStream | null>(null);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
	const dataChannelRef = useRef<RTCDataChannel | null>(null);
	const audioContextRef = useRef<AudioContext | null>(null);
	const meterFrameRef = useRef<number | null>(null);
	const timerRef = useRef<number | null>(null);
	const startedAtRef = useRef<number | null>(null);
	const chunksRef = useRef<Blob[]>([]);
	const turnsRef = useRef<Map<string, ComposerVoiceTurn>>(new Map());
	const turnOrderRef = useRef<string[]>([]);
	const transcriptRef = useRef('');
	const statusRef = useRef<ComposerTranscriptStatus>('idle');
	const realtimeFailedRef = useRef(false);
	const canceledRef = useRef(false);
	const isFinishingRef = useRef(false);

	const [status, setStatus] = useState<ComposerTranscriptStatus>('idle');
	const [transport, setTransport] = useState<ComposerTranscriptTransport>('idle');
	const [turns, setTurns] = useState<ComposerVoiceTurn[]>([]);
	const [liveText, setLiveText] = useState('');
	const [inputLevel, setInputLevel] = useState(0);
	const [elapsedMs, setElapsedMs] = useState(0);
	const [error, setError] = useState<string | null>(null);

	const updateStatus = useCallback((nextStatus: ComposerTranscriptStatus) => {
		statusRef.current = nextStatus;
		setStatus(nextStatus);
	}, []);

	const orderedTurns = useCallback(() => {
		return orderTurnIds(turnsRef.current, turnOrderRef.current).flatMap((itemId) => {
			const turn = turnsRef.current.get(itemId);
			return turn ? [turn] : [];
		});
	}, []);

	const emitTranscript = useCallback(() => {
		const nextTurns = orderedTurns();
		const text = nextTurns
			.map((turn) => (turn.finalText ?? turn.text).trim())
			.filter(Boolean)
			.join(' ')
			.trim();

		transcriptRef.current = text;
		setTurns(nextTurns);
		setLiveText(text);
		if (text) onTranscript(text, nextTurns);
	}, [onTranscript, orderedTurns]);

	const ensureTurn = useCallback((itemId: string) => {
		const existing = turnsRef.current.get(itemId);
		if (existing) return existing;

		const turn: ComposerVoiceTurn = {
			itemId,
			text: '',
			status: 'streaming',
			updatedAt: Date.now(),
		};
		turnsRef.current.set(itemId, turn);
		turnOrderRef.current.push(itemId);
		return turn;
	}, []);

	const handleRealtimeEvent = useCallback(
		(event: RealtimeEvent) => {
			if (event.type === 'input_audio_buffer.committed' && event.item_id) {
				const turn = ensureTurn(event.item_id);
				turn.previousItemId = event.previous_item_id;
				turn.updatedAt = Date.now();
				return;
			}

			if (event.type === 'conversation.item.input_audio_transcription.delta' && event.item_id && event.delta) {
				const turn = ensureTurn(event.item_id);
				turn.text += event.delta;
				turn.status = 'streaming';
				turn.updatedAt = Date.now();
				emitTranscript();
				return;
			}

			if (event.type === 'conversation.item.input_audio_transcription.completed' && event.item_id) {
				const turn = ensureTurn(event.item_id);
				turn.finalText = event.transcript ?? turn.text;
				turn.status = 'final';
				turn.confidence = estimateConfidence(event.logprobs);
				turn.updatedAt = Date.now();
				emitTranscript();
				return;
			}

			if (event.type === 'transcript.text.delta' && event.delta) {
				const turn = ensureTurn('transcript.text');
				turn.text += event.delta;
				turn.status = 'streaming';
				turn.updatedAt = Date.now();
				emitTranscript();
				return;
			}

			if (event.type === 'transcript.text.done' && event.text) {
				const turn = ensureTurn('transcript.text');
				turn.finalText = event.text;
				turn.status = 'final';
				turn.updatedAt = Date.now();
				emitTranscript();
				return;
			}

			if (event.type === 'error') {
				realtimeFailedRef.current = true;
				setTransport('fallback');
				setError(
					readRealtimeError(event.error) ??
						'Realtime stream failed. Buffered transcription will finish on stop.',
				);
				console.error('Realtime transcription error:', event.error ?? event);
			}
		},
		[emitTranscript, ensureTurn],
	);

	const closeRealtime = useCallback(() => {
		const dataChannel = dataChannelRef.current;
		if (dataChannel && dataChannel.readyState !== 'closed') dataChannel.close();
		dataChannelRef.current = null;

		const peerConnection = peerConnectionRef.current;
		if (peerConnection) peerConnection.close();
		peerConnectionRef.current = null;
	}, []);

	const stopStream = useCallback(() => {
		streamRef.current?.getTracks().forEach((track) => track.stop());
		streamRef.current = null;
	}, []);

	const resetTranscript = useCallback(() => {
		turnsRef.current = new Map();
		turnOrderRef.current = [];
		transcriptRef.current = '';
		setTurns([]);
		setLiveText('');
	}, []);

	const stopMeter = useCallback(() => {
		if (meterFrameRef.current !== null) {
			window.cancelAnimationFrame(meterFrameRef.current);
			meterFrameRef.current = null;
		}

		const audioContext = audioContextRef.current;
		audioContextRef.current = null;
		setInputLevel(0);
		if (audioContext) void audioContext.close().catch(() => {});
	}, []);

	const startMeter = useCallback(
		(stream: MediaStream) => {
			stopMeter();

			const audioWindow = window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };
			const AudioContextConstructor = audioWindow.AudioContext || audioWindow.webkitAudioContext;
			if (!AudioContextConstructor) return;

			const audioContext = new AudioContextConstructor();
			const analyser = audioContext.createAnalyser();
			analyser.fftSize = 256;

			const source = audioContext.createMediaStreamSource(stream);
			source.connect(analyser);
			audioContextRef.current = audioContext;

			const samples = new Uint8Array(analyser.frequencyBinCount);

			const tick = () => {
				analyser.getByteTimeDomainData(samples);

				let sum = 0;
				for (const sample of samples) {
					const centered = sample - 128;
					sum += centered * centered;
				}

				setInputLevel(Math.min(1, Math.sqrt(sum / samples.length) / 42));
				meterFrameRef.current = window.requestAnimationFrame(tick);
			};

			tick();
		},
		[stopMeter],
	);

	const stopTimer = useCallback((resetElapsed = true) => {
		if (timerRef.current !== null) {
			window.clearInterval(timerRef.current);
			timerRef.current = null;
		}
		startedAtRef.current = null;
		if (resetElapsed) setElapsedMs(0);
	}, []);

	const startTimer = useCallback(() => {
		stopTimer();
		startedAtRef.current = Date.now();
		timerRef.current = window.setInterval(() => {
			const startedAt = startedAtRef.current;
			if (startedAt) setElapsedMs(Date.now() - startedAt);
		}, 250);
	}, [stopTimer]);

	const startRealtime = useCallback(
		async (stream: MediaStream) => {
			const peerConnection = new RTCPeerConnection();
			peerConnectionRef.current = peerConnection;

			for (const track of stream.getAudioTracks()) {
				peerConnection.addTrack(track, stream);
			}

			const dataChannel = peerConnection.createDataChannel('oai-events');
			dataChannelRef.current = dataChannel;

			dataChannel.addEventListener('message', (event) => {
				try {
					handleRealtimeEvent(JSON.parse(event.data));
				} catch (parseError) {
					console.error('Failed to parse realtime transcription event:', parseError);
				}
			});

			dataChannel.addEventListener('open', () => {
				if (canceledRef.current || isFinishingRef.current) return;
				setTransport('webrtc');
				updateStatus('streaming');
			});

			dataChannel.addEventListener('error', (event) => {
				if (canceledRef.current || isFinishingRef.current) return;
				realtimeFailedRef.current = true;
				setTransport('fallback');
				setError('Realtime data channel failed. Buffered transcription will finish on stop.');
				console.error('Realtime transcription data channel error:', event);
			});

			peerConnection.addEventListener('connectionstatechange', () => {
				if (canceledRef.current || isFinishingRef.current) return;
				if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected') {
					realtimeFailedRef.current = true;
					setTransport('fallback');
					setError('Realtime connection dropped. Buffered transcription will finish on stop.');
				}
			});

			const offer = await peerConnection.createOffer();
			await peerConnection.setLocalDescription(offer);

			const answerSdp = await createRealtimeCall({
				sdp: offer.sdp ?? '',
				...(promptContext ? { promptContext } : {}),
				...(dictionary?.length ? { dictionary } : {}),
				...(language ? { language } : {}),
				vadMode,
				latency,
			});

			await peerConnection.setRemoteDescription({
				type: 'answer',
				sdp: answerSdp,
			});
		},
		[createRealtimeCall, dictionary, handleRealtimeEvent, language, latency, promptContext, updateStatus, vadMode],
	);

	const finish = useCallback(
		async (audio?: Blob) => {
			if (isFinishingRef.current || canceledRef.current) return;
			isFinishingRef.current = true;
			updateStatus('finalizing');
			stopTimer(false);
			stopMeter();

			try {
				if (!realtimeFailedRef.current) await wait(realtimeFinishWaitMs);
				if (canceledRef.current) return;

				const realtimeTranscript = transcriptRef.current.trim();
				if (realtimeTranscript) {
					onComplete(realtimeTranscript, orderedTurns());
					return;
				}

				if (!audio) {
					toast.error('No voice detected.');
					return;
				}

				setTransport('fallback');
				const audioBuffer = await audio.arrayBuffer();
				const text = await transcribeAction({
					audio: audioBuffer,
					...(audio.type ? { contentType: audio.type } : {}),
					...(promptContext ? { promptContext } : {}),
					...(dictionary?.length ? { dictionary } : {}),
					...(language ? { language } : {}),
				});

				const transcription = text.trim();
				if (canceledRef.current) return;

				if (transcription) {
					onTranscript(transcription, []);
					onComplete(transcription, []);
				} else {
					toast.error('No voice detected.');
				}
			} catch (finishError) {
				if (!canceledRef.current) {
					console.error('Error finalizing dictation:', finishError);
					toast.error('Failed to transcribe audio.');
				}
			} finally {
				closeRealtime();
				stopStream();
				stopTimer();
				isFinishingRef.current = false;
				setTransport('idle');
				updateStatus('idle');
			}
		},
		[
			closeRealtime,
			dictionary,
			language,
			onComplete,
			onTranscript,
			orderedTurns,
			promptContext,
			stopMeter,
			stopStream,
			stopTimer,
			transcribeAction,
			updateStatus,
		],
	);

	const start = useCallback(async () => {
		if (statusRef.current !== 'idle') return;

		try {
			canceledRef.current = false;
			realtimeFailedRef.current = false;
			chunksRef.current = [];
			resetTranscript();
			setError(null);
			setTransport('idle');
			updateStatus('connecting');

			const stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true,
				},
			});
			streamRef.current = stream;
			startMeter(stream);
			startTimer();

			const mediaRecorder = createMediaRecorder(stream);
			mediaRecorderRef.current = mediaRecorder;

			if (mediaRecorder) {
				mediaRecorder.ondataavailable = (event) => {
					if (event.data.size > 0) chunksRef.current.push(event.data);
				};

				mediaRecorder.onstop = () => {
					if (canceledRef.current) return;
					const audio = new Blob(chunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
					void finish(audio);
				};

				mediaRecorder.start(1000);
			}

			void startRealtime(stream).catch((startError) => {
				realtimeFailedRef.current = true;
				setTransport('fallback');
				setError(
					readRealtimeError(startError) ??
						'Realtime unavailable. Buffered transcription will finish on stop.',
				);
				updateStatus('streaming');
				console.error('Realtime transcription unavailable:', startError);
			});
		} catch (startError) {
			console.error('Error starting dictation:', startError);
			toast.error('Unable to access microphone.');
			closeRealtime();
			stopMeter();
			stopStream();
			stopTimer();
			setTransport('idle');
			updateStatus('idle');
		}
	}, [
		closeRealtime,
		finish,
		resetTranscript,
		startMeter,
		startRealtime,
		startTimer,
		stopMeter,
		stopStream,
		stopTimer,
		updateStatus,
	]);

	const stop = useCallback(() => {
		if (statusRef.current !== 'streaming' && statusRef.current !== 'connecting') return;

		updateStatus('finalizing');

		const dataChannel = dataChannelRef.current;
		if (dataChannel?.readyState === 'open') {
			dataChannel.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
		}

		const mediaRecorder = mediaRecorderRef.current;
		if (mediaRecorder && mediaRecorder.state !== 'inactive') {
			mediaRecorder.requestData();
			mediaRecorder.stop();
		} else {
			void finish();
		}

		stopStream();
	}, [finish, stopStream, updateStatus]);

	const cancel = useCallback(() => {
		canceledRef.current = true;
		onCancel();

		const mediaRecorder = mediaRecorderRef.current;
		if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();

		closeRealtime();
		stopMeter();
		stopStream();
		stopTimer();
		resetTranscript();
		setError(null);
		setTransport('idle');
		updateStatus('idle');
	}, [closeRealtime, onCancel, resetTranscript, stopMeter, stopStream, stopTimer, updateStatus]);

	useEffect(() => {
		return () => {
			canceledRef.current = true;
			closeRealtime();
			stopMeter();
			stopStream();
			stopTimer();
		};
	}, [closeRealtime, stopMeter, stopStream, stopTimer]);

	return {
		status,
		transport,
		turns,
		liveText,
		inputLevel,
		elapsedMs,
		error,
		start,
		stop,
		cancel,
	};
}

function createMediaRecorder(stream: MediaStream) {
	if (typeof MediaRecorder === 'undefined') return null;

	const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((type) =>
		MediaRecorder.isTypeSupported(type),
	);

	return new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
}

function orderTurnIds(turns: Map<string, ComposerVoiceTurn>, fallbackOrder: string[]) {
	const nextByPrevious = new Map<string | null, string>();

	for (const turn of turns.values()) {
		if (turn.previousItemId !== undefined) nextByPrevious.set(turn.previousItemId, turn.itemId);
	}

	const ordered: string[] = [];
	const seen = new Set<string>();
	let current = nextByPrevious.get(null);

	while (current && !seen.has(current)) {
		ordered.push(current);
		seen.add(current);
		current = nextByPrevious.get(current);
	}

	for (const itemId of fallbackOrder) {
		if (!seen.has(itemId)) ordered.push(itemId);
	}

	return ordered;
}

function estimateConfidence(logprobs?: Array<{ logprob?: number }>) {
	if (!logprobs?.length) return undefined;

	const usable = logprobs.map((entry) => entry.logprob).filter((value): value is number => typeof value === 'number');
	if (!usable.length) return undefined;

	const average = usable.reduce((sum, value) => sum + value, 0) / usable.length;
	return Math.max(0, Math.min(1, Math.exp(average)));
}

function readRealtimeError(error: unknown) {
	if (!error) return null;
	if (error instanceof Error) return error.message;
	if (typeof error === 'string') return error;
	if (typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message;
	return null;
}

function wait(ms: number) {
	return new Promise((resolve) => window.setTimeout(resolve, ms));
}
