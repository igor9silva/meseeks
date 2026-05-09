import { useAction } from 'convex/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { api } from 'convex/_generated/api';

type RecordingStatus = 'idle' | 'recording' | 'transcribing';
type TranscriptionMode = 'idle' | 'connecting' | 'realtime' | 'fallback';

type TranscriptTurn = {
	itemId: string;
	previousItemId?: string | null;
	delta: string;
	final?: string;
};

type RealtimeEvent = {
	type?: string;
	item_id?: string;
	previous_item_id?: string | null;
	delta?: string;
	transcript?: string;
	text?: string;
	error?: unknown;
};

interface UseVoiceRecordingProps {
	promptContext?: string;
	language?: string;
	onTranscriptionDelta?: (text: string) => void;
	onTranscriptionComplete: (text: string) => void;
	onTranscriptionCancel?: () => void;
}

const realtimeCallsUrl = 'https://api.openai.com/v1/realtime/calls';
const realtimeFinishWaitMs = 1400;

export function useVoiceRecording({
	promptContext,
	language,
	onTranscriptionDelta,
	onTranscriptionComplete,
	onTranscriptionCancel,
}: UseVoiceRecordingProps) {
	//
	const createRealtimeSession = useAction(api.magicRock.createRealtimeTranscriptionSession);
	const transcribeAction = useAction(api.magicRock.transcribe);

	const streamRef = useRef<MediaStream | null>(null);
	const currentStatusRef = useRef<RecordingStatus>('idle');
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
	const dataChannelRef = useRef<RTCDataChannel | null>(null);
	const audioContextRef = useRef<AudioContext | null>(null);
	const meterFrameRef = useRef<number | null>(null);
	const timerRef = useRef<number | null>(null);
	const recordingStartedAtRef = useRef<number | null>(null);
	const chunksRef = useRef<Blob[]>([]);
	const turnsRef = useRef<Map<string, TranscriptTurn>>(new Map());
	const turnOrderRef = useRef<string[]>([]);
	const transcriptRef = useRef('');
	const realtimeFailedRef = useRef(false);
	const canceledRef = useRef(false);
	const isFinishingRef = useRef(false);

	const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>('idle');
	const [transcriptionMode, setTranscriptionMode] = useState<TranscriptionMode>('idle');
	const [liveTranscript, setLiveTranscript] = useState('');
	const [inputLevel, setInputLevel] = useState(0);
	const [elapsedMs, setElapsedMs] = useState(0);

	const updateStatus = useCallback((status: RecordingStatus) => {
		//
		currentStatusRef.current = status;
		setRecordingStatus(status);
	}, []);

	const emitTranscript = useCallback(() => {
		//
		const text = orderTranscript(turnsRef.current, turnOrderRef.current);
		transcriptRef.current = text;
		setLiveTranscript(text);

		if (text) {
			onTranscriptionDelta?.(text);
		}
	}, [onTranscriptionDelta]);

	const ensureTurn = useCallback((itemId: string) => {
		//
		const existing = turnsRef.current.get(itemId);
		if (existing) return existing;

		const turn: TranscriptTurn = { itemId, delta: '' };
		turnsRef.current.set(itemId, turn);
		turnOrderRef.current.push(itemId);
		return turn;
	}, []);

	const handleRealtimeEvent = useCallback(
		(event: RealtimeEvent) => {
			//
			if (event.type === 'input_audio_buffer.committed' && event.item_id) {
				const turn = ensureTurn(event.item_id);
				turn.previousItemId = event.previous_item_id;
				return;
			}

			if (event.type === 'conversation.item.input_audio_transcription.delta' && event.item_id && event.delta) {
				const turn = ensureTurn(event.item_id);
				turn.delta += event.delta;
				emitTranscript();
				return;
			}

			if (event.type === 'conversation.item.input_audio_transcription.completed' && event.item_id) {
				const turn = ensureTurn(event.item_id);
				turn.final = event.transcript ?? turn.delta;
				emitTranscript();
				return;
			}

			if (event.type === 'transcript.text.delta' && event.delta) {
				const turn = ensureTurn('transcript.text');
				turn.delta += event.delta;
				emitTranscript();
				return;
			}

			if (event.type === 'transcript.text.done' && event.text) {
				const turn = ensureTurn('transcript.text');
				turn.final = event.text;
				emitTranscript();
				return;
			}

			if (event.type === 'error') {
				realtimeFailedRef.current = true;
				setTranscriptionMode('fallback');
				console.error('Realtime transcription error:', event.error ?? event);
			}
		},
		[emitTranscript, ensureTurn],
	);

	const closeRealtime = useCallback(() => {
		//
		const dataChannel = dataChannelRef.current;
		if (dataChannel && dataChannel.readyState !== 'closed') {
			dataChannel.close();
		}
		dataChannelRef.current = null;

		const peerConnection = peerConnectionRef.current;
		if (peerConnection) {
			peerConnection.close();
		}
		peerConnectionRef.current = null;
	}, []);

	const stopStream = useCallback(() => {
		//
		if (streamRef.current) {
			streamRef.current.getTracks().forEach((track) => track.stop());
			streamRef.current = null;
		}
	}, []);

	const resetTranscript = useCallback(() => {
		//
		turnsRef.current = new Map();
		turnOrderRef.current = [];
		transcriptRef.current = '';
		setLiveTranscript('');
	}, []);

	const stopMeter = useCallback(() => {
		//
		if (meterFrameRef.current !== null) {
			window.cancelAnimationFrame(meterFrameRef.current);
			meterFrameRef.current = null;
		}

		const audioContext = audioContextRef.current;
		audioContextRef.current = null;
		setInputLevel(0);

		if (audioContext) {
			void audioContext.close().catch(() => {});
		}
	}, []);

	const startMeter = useCallback(
		(stream: MediaStream) => {
			//
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
		//
		if (timerRef.current !== null) {
			window.clearInterval(timerRef.current);
			timerRef.current = null;
		}
		recordingStartedAtRef.current = null;
		if (resetElapsed) setElapsedMs(0);
	}, []);

	const startTimer = useCallback(() => {
		//
		stopTimer();
		recordingStartedAtRef.current = Date.now();
		timerRef.current = window.setInterval(() => {
			const startedAt = recordingStartedAtRef.current;
			if (startedAt) setElapsedMs(Date.now() - startedAt);
		}, 250);
	}, [stopTimer]);

	const startRealtime = useCallback(
		async (stream: MediaStream) => {
			//
			const session = await createRealtimeSession({
				...(promptContext ? { promptContext } : {}),
				...(language ? { language } : {}),
			});

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
				} catch (error) {
					console.error('Failed to parse realtime transcription event:', error);
				}
			});

			dataChannel.addEventListener('open', () => {
				setTranscriptionMode('realtime');
			});

			dataChannel.addEventListener('error', (event) => {
				realtimeFailedRef.current = true;
				setTranscriptionMode('fallback');
				console.error('Realtime transcription data channel error:', event);
			});

			peerConnection.addEventListener('connectionstatechange', () => {
				if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected') {
					realtimeFailedRef.current = true;
					setTranscriptionMode('fallback');
				}
			});

			const offer = await peerConnection.createOffer();
			await peerConnection.setLocalDescription(offer);

			const response = await fetch(realtimeCallsUrl, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${session.clientSecret}`,
					'Content-Type': 'application/sdp',
				},
				body: offer.sdp ?? '',
			});

			if (!response.ok) {
				realtimeFailedRef.current = true;
				setTranscriptionMode('fallback');
				throw new Error(`Realtime transcription call failed: ${response.status}`);
			}

			await peerConnection.setRemoteDescription({
				type: 'answer',
				sdp: await response.text(),
			});
		},
		[createRealtimeSession, handleRealtimeEvent, language, promptContext],
	);

	const finishRecording = useCallback(
		async (audio?: Blob) => {
			//
			if (isFinishingRef.current || canceledRef.current) return;
			isFinishingRef.current = true;
			updateStatus('transcribing');
			stopTimer(false);
			stopMeter();

			try {
				if (!realtimeFailedRef.current) {
					await wait(realtimeFinishWaitMs);
				}

				if (canceledRef.current) return;

				const realtimeTranscript = transcriptRef.current.trim();
				if (realtimeTranscript) {
					onTranscriptionComplete(realtimeTranscript);
					return;
				}

				if (!audio) {
					toast.error('No voice detected. Please try again.');
					return;
				}

				setTranscriptionMode('fallback');

				const audioBuffer = await audio.arrayBuffer();
				const text = await transcribeAction({
					audio: audioBuffer,
					...(audio.type ? { contentType: audio.type } : {}),
					...(promptContext ? { promptContext } : {}),
					...(language ? { language } : {}),
				});

				const transcription = text.trim();
				if (canceledRef.current) return;

				if (transcription) {
					onTranscriptionComplete(transcription);
				} else {
					toast.error('No voice detected. Please try again.');
				}
			} catch (error) {
				if (!canceledRef.current) {
					console.error('Error transcribing audio:', error);
					toast.error('Failed to transcribe audio. Please try again.');
				}
			} finally {
				closeRealtime();
				stopStream();
				stopTimer();
				resetTranscript();
				isFinishingRef.current = false;
				setTranscriptionMode('idle');
				updateStatus('idle');
			}
		},
		[
			closeRealtime,
			language,
			onTranscriptionComplete,
			promptContext,
			resetTranscript,
			stopMeter,
			stopStream,
			stopTimer,
			transcribeAction,
			updateStatus,
		],
	);

	const startRecording = useCallback(async () => {
		//
		if (currentStatusRef.current !== 'idle') return;

		try {
			canceledRef.current = false;
			realtimeFailedRef.current = false;
			chunksRef.current = [];
			resetTranscript();
			setTranscriptionMode('connecting');

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
					if (event.data.size > 0) {
						chunksRef.current.push(event.data);
					}
				};

				mediaRecorder.onstop = () => {
					if (canceledRef.current) return;

					const audio = new Blob(chunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
					void finishRecording(audio);
				};

				mediaRecorder.start(1000);
			}

			updateStatus('recording');

			void startRealtime(stream).catch((error) => {
				realtimeFailedRef.current = true;
				setTranscriptionMode('fallback');
				console.error('Realtime transcription unavailable; falling back after recording stops:', error);
			});
			//
		} catch (error) {
			console.error('Error starting recording:', error);
			toast.error('Unable to access microphone. Please check your browser permissions.');
			closeRealtime();
			stopMeter();
			stopStream();
			stopTimer();
			resetTranscript();
			setTranscriptionMode('idle');
			updateStatus('idle');
		}
		//
	}, [
		closeRealtime,
		finishRecording,
		resetTranscript,
		startMeter,
		startRealtime,
		startTimer,
		stopMeter,
		stopStream,
		stopTimer,
		updateStatus,
	]);

	const stopRecording = useCallback(() => {
		//
		if (currentStatusRef.current !== 'recording') return;

		updateStatus('transcribing');

		const dataChannel = dataChannelRef.current;
		if (dataChannel?.readyState === 'open') {
			dataChannel.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
		}

		const mediaRecorder = mediaRecorderRef.current;
		if (mediaRecorder && mediaRecorder.state !== 'inactive') {
			mediaRecorder.requestData();
			mediaRecorder.stop();
		} else {
			void finishRecording();
		}

		stopStream();
	}, [finishRecording, stopStream, updateStatus]);

	const cancelRecording = useCallback(() => {
		//
		canceledRef.current = true;
		onTranscriptionCancel?.();

		const mediaRecorder = mediaRecorderRef.current;
		if (mediaRecorder && mediaRecorder.state !== 'inactive') {
			mediaRecorder.stop();
		}

		closeRealtime();
		stopMeter();
		stopStream();
		stopTimer();
		resetTranscript();
		setTranscriptionMode('idle');
		updateStatus('idle');
	}, [closeRealtime, onTranscriptionCancel, resetTranscript, stopMeter, stopStream, stopTimer, updateStatus]);

	useEffect(() => {
		//
		return () => {
			canceledRef.current = true;
			closeRealtime();
			stopMeter();
			stopStream();
			stopTimer();
		};
	}, [closeRealtime, stopMeter, stopStream, stopTimer]);

	return {
		recordingStatus,
		transcriptionMode,
		liveTranscript,
		inputLevel,
		elapsedMs,
		startRecording,
		stopRecording,
		cancelRecording,
	};
}

function createMediaRecorder(stream: MediaStream) {
	//
	if (typeof MediaRecorder === 'undefined') return null;

	const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((type) =>
		MediaRecorder.isTypeSupported(type),
	);

	return new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
}

function orderTranscript(turns: Map<string, TranscriptTurn>, fallbackOrder: string[]) {
	//
	const orderedIds = orderTurnIds(turns, fallbackOrder);
	return orderedIds
		.map((itemId) => {
			const turn = turns.get(itemId);
			return (turn?.final ?? turn?.delta ?? '').trim();
		})
		.filter(Boolean)
		.join(' ')
		.trim();
}

function orderTurnIds(turns: Map<string, TranscriptTurn>, fallbackOrder: string[]) {
	//
	const nextByPrevious = new Map<string | null, string>();

	for (const turn of turns.values()) {
		if (turn.previousItemId !== undefined) {
			nextByPrevious.set(turn.previousItemId, turn.itemId);
		}
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

function wait(ms: number) {
	//
	return new Promise((resolve) => window.setTimeout(resolve, ms));
}
