import { useAction } from 'convex/react';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { api } from 'convex/_generated/api';

export type RecordingStatus = 'idle' | 'connecting' | 'recording' | 'transcribing';

type TranscriptionSegment = {
	text: string;
	final: boolean;
};

type RealtimeEvent = {
	type?: string;
	item_id?: string;
	previous_item_id?: string;
	delta?: string;
	transcript?: string;
	error?: {
		message?: string;
	};
};

type UseVoiceRecordingProps = {
	onTranscriptionUpdate: (text: string) => void;
	onTranscriptionComplete?: (text: string) => void;
	language?: string;
};

const transcriptionSettleMs = 1200;
const defaultLanguage = 'en';

export function useVoiceRecording({
	onTranscriptionUpdate,
	onTranscriptionComplete,
	language = defaultLanguage,
}: UseVoiceRecordingProps) {
	//
	const createRealtimeCall = useAction(api.magicRock.createRealtimeTranscriptionCall);
	const transcribeAction = useAction(api.magicRock.transcribe);

	const streamRef = useRef<MediaStream | null>(null);
	const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
	const dataChannelRef = useRef<RTCDataChannel | null>(null);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const mediaChunksRef = useRef<Blob[]>([]);
	const currentStatusRef = useRef<RecordingStatus>('idle');
	const modeRef = useRef<'realtime' | 'buffered' | null>(null);
	const baseTextRef = useRef('');
	const latestTextRef = useRef('');
	const sessionIdRef = useRef(0);
	const ignoreBufferedStopRef = useRef(false);
	const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const itemOrderRef = useRef<string[]>([]);
	const transcriptByItemIdRef = useRef<Map<string, TranscriptionSegment>>(new Map());
	const onUpdateRef = useRef(onTranscriptionUpdate);
	const onCompleteRef = useRef(onTranscriptionComplete);

	onUpdateRef.current = onTranscriptionUpdate;
	onCompleteRef.current = onTranscriptionComplete;

	const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>('idle');

	const updateStatus = useCallback((status: RecordingStatus) => {
		//
		currentStatusRef.current = status;
		setRecordingStatus(status);
	}, []);

	const clearSettleTimer = useCallback(() => {
		//
		if (!settleTimerRef.current) return;
		clearTimeout(settleTimerRef.current);
		settleTimerRef.current = null;
	}, []);

	const stopStream = useCallback(() => {
		//
		streamRef.current?.getTracks().forEach((track) => track.stop());
		streamRef.current = null;
	}, []);

	const closeRealtime = useCallback(() => {
		//
		dataChannelRef.current?.close();
		dataChannelRef.current = null;

		peerConnectionRef.current?.getSenders().forEach((sender) => sender.track?.stop());
		peerConnectionRef.current?.close();
		peerConnectionRef.current = null;

		stopStream();
	}, [stopStream]);

	const finishRealtime = useCallback(() => {
		//
		clearSettleTimer();
		closeRealtime();
		modeRef.current = null;
		onCompleteRef.current?.(latestTextRef.current);
		updateStatus('idle');
	}, [clearSettleTimer, closeRealtime, updateStatus]);

	const emitTranscript = useCallback(() => {
		//
		const transcript = itemOrderRef.current
			.map((itemId) => transcriptByItemIdRef.current.get(itemId)?.text)
			.filter((text): text is string => Boolean(text?.trim()))
			.join(' ');

		const nextText = appendTranscript(baseTextRef.current, normalizeTranscript(transcript));
		latestTextRef.current = nextText;
		onUpdateRef.current(nextText);
	}, []);

	const rememberItem = useCallback((itemId: string, previousItemId?: string) => {
		//
		if (itemOrderRef.current.includes(itemId)) return;

		if (previousItemId) {
			const previousIndex = itemOrderRef.current.indexOf(previousItemId);
			if (previousIndex !== -1) {
				itemOrderRef.current.splice(previousIndex + 1, 0, itemId);
				return;
			}
		}

		itemOrderRef.current.push(itemId);
	}, []);

	const handleRealtimeEvent = useCallback(
		(event: RealtimeEvent) => {
			//
			if (event.type === 'input_audio_buffer.committed' && event.item_id) {
				rememberItem(event.item_id, event.previous_item_id);
				return;
			}

			if (event.type === 'conversation.item.input_audio_transcription.delta') {
				if (!event.item_id || typeof event.delta !== 'string') return;

				rememberItem(event.item_id);
				const existing = transcriptByItemIdRef.current.get(event.item_id);
				transcriptByItemIdRef.current.set(event.item_id, {
					text: `${existing?.text ?? ''}${event.delta}`,
					final: false,
				});
				emitTranscript();
				return;
			}

			if (event.type === 'conversation.item.input_audio_transcription.completed') {
				if (!event.item_id || typeof event.transcript !== 'string') return;

				rememberItem(event.item_id);
				transcriptByItemIdRef.current.set(event.item_id, {
					text: event.transcript,
					final: true,
				});
				emitTranscript();
				return;
			}

			if (event.type === 'conversation.item.input_audio_transcription.failed') {
				toast.error('Realtime transcription failed.', {
					description: event.error?.message,
				});
				return;
			}

			if (event.type === 'error') {
				toast.error('Realtime transcription error.', {
					description: event.error?.message,
				});
			}
		},
		[emitTranscript, rememberItem],
	);

	const handleDataChannelMessage = useCallback(
		(event: MessageEvent<string>) => {
			//
			try {
				handleRealtimeEvent(JSON.parse(event.data) as RealtimeEvent);
			} catch (error) {
				console.error('Failed to parse realtime transcription event:', error);
			}
		},
		[handleRealtimeEvent],
	);

	const resetTranscript = useCallback((baseText: string) => {
		//
		baseTextRef.current = baseText;
		latestTextRef.current = baseText;
		itemOrderRef.current = [];
		transcriptByItemIdRef.current = new Map();
	}, []);

	const startRealtimeRecording = useCallback(
		async (sessionId: number, baseText: string) => {
			//
			modeRef.current = 'realtime';

			const stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true,
				},
			});

			if (sessionIdRef.current !== sessionId) {
				stream.getTracks().forEach((track) => track.stop());
				return;
			}

			streamRef.current = stream;

			const peerConnection = new RTCPeerConnection();
			peerConnectionRef.current = peerConnection;

			stream.getAudioTracks().forEach((track) => peerConnection.addTrack(track, stream));

			const dataChannel = peerConnection.createDataChannel('oai-events');
			dataChannelRef.current = dataChannel;

			dataChannel.addEventListener('open', () => {
				if (sessionIdRef.current === sessionId && currentStatusRef.current === 'connecting') {
					updateStatus('recording');
				}
			});
			dataChannel.addEventListener('message', handleDataChannelMessage);
			dataChannel.addEventListener('error', () => {
				toast.error('Realtime transcription channel failed.');
			});

			peerConnection.addEventListener('connectionstatechange', () => {
				if (peerConnection.connectionState === 'failed') {
					toast.error('Realtime transcription connection failed.');
					sessionIdRef.current += 1;
					closeRealtime();
					modeRef.current = null;
					updateStatus('idle');
				}
			});

			const offer = await peerConnection.createOffer();
			await peerConnection.setLocalDescription(offer);

			if (!offer.sdp) {
				throw new Error('Realtime transcription did not create an SDP offer');
			}

			const { sdp } = await createRealtimeCall({
				sdp: offer.sdp,
				dictionary: extractDictionary(baseText),
				language,
				noiseReduction: 'near_field',
				vad: {
					threshold: 0.5,
					prefixPaddingMs: 300,
					silenceDurationMs: 500,
				},
			});

			if (sessionIdRef.current !== sessionId) {
				closeRealtime();
				return;
			}

			await peerConnection.setRemoteDescription({
				type: 'answer',
				sdp,
			});

			if (currentStatusRef.current === 'connecting') {
				updateStatus('recording');
			}
		},
		[closeRealtime, createRealtimeCall, handleDataChannelMessage, language, updateStatus],
	);

	const startBufferedRecording = useCallback(
		async (baseText: string) => {
			//
			if (!window.MediaRecorder) {
				throw new Error('This browser does not support voice recording');
			}

			modeRef.current = 'buffered';
			ignoreBufferedStopRef.current = false;
			mediaChunksRef.current = [];

			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			streamRef.current = stream;

			const mediaRecorder = new MediaRecorder(stream);
			mediaRecorderRef.current = mediaRecorder;

			mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					mediaChunksRef.current.push(event.data);
				}
			};

			mediaRecorder.onstop = async () => {
				//
				stopStream();

				if (ignoreBufferedStopRef.current) {
					return;
				}

				updateStatus('transcribing');

				try {
					const audio = new Blob(mediaChunksRef.current, { type: mediaRecorder.mimeType });
					const audioBuffer = await audio.arrayBuffer();
					const text = await transcribeAction({
						audio: audioBuffer,
						contentType: audio.type || undefined,
						dictionary: extractDictionary(baseText),
						language,
					});
					const nextText = appendTranscript(baseText, text);

					latestTextRef.current = nextText;
					onUpdateRef.current(nextText);
					onCompleteRef.current?.(nextText);
				} catch (error) {
					console.error('Error transcribing audio:', error);
					toast.error('Failed to transcribe audio. Please try again.');
				} finally {
					modeRef.current = null;
					updateStatus('idle');
				}
			};

			mediaRecorder.start();
			updateStatus('recording');
		},
		[language, stopStream, transcribeAction, updateStatus],
	);

	const startRecording = useCallback(
		async (baseText = '') => {
			//
			if (currentStatusRef.current !== 'idle') return;

			const sessionId = sessionIdRef.current + 1;
			sessionIdRef.current = sessionId;
			clearSettleTimer();
			resetTranscript(baseText);
			updateStatus('connecting');

			try {
				if (supportsRealtimeRecording()) {
					await startRealtimeRecording(sessionId, baseText);
				} else {
					await startBufferedRecording(baseText);
				}
			} catch (error) {
				console.error('Error starting voice recording:', error);
				closeRealtime();
				stopStream();
				modeRef.current = null;
				updateStatus('idle');
				toast.error('Unable to start voice transcription. Please check your microphone permissions.');
			}
		},
		[
			clearSettleTimer,
			closeRealtime,
			resetTranscript,
			startBufferedRecording,
			startRealtimeRecording,
			stopStream,
			updateStatus,
		],
	);

	const stopRecording = useCallback(() => {
		//
		if (currentStatusRef.current !== 'recording' && currentStatusRef.current !== 'connecting') return;

		if (modeRef.current === 'buffered') {
			if (mediaRecorderRef.current?.state === 'recording') {
				mediaRecorderRef.current.stop();
			}
			stopStream();
			return;
		}

		updateStatus('transcribing');
		stopStream();
		clearSettleTimer();
		settleTimerRef.current = setTimeout(finishRealtime, transcriptionSettleMs);
	}, [clearSettleTimer, finishRealtime, stopStream, updateStatus]);

	const cancelRecording = useCallback(() => {
		//
		sessionIdRef.current += 1;
		ignoreBufferedStopRef.current = true;
		clearSettleTimer();

		if (mediaRecorderRef.current?.state === 'recording') {
			mediaRecorderRef.current.stop();
		}

		closeRealtime();
		stopStream();
		modeRef.current = null;
		latestTextRef.current = baseTextRef.current;
		onUpdateRef.current(baseTextRef.current);
		updateStatus('idle');
	}, [clearSettleTimer, closeRealtime, stopStream, updateStatus]);

	return {
		recordingStatus,
		startRecording,
		stopRecording,
		cancelRecording,
	};
}

function supportsRealtimeRecording() {
	//
	return typeof window !== 'undefined' && 'RTCPeerConnection' in window && navigator.mediaDevices;
}

function appendTranscript(baseText: string, transcript: string) {
	//
	const nextTranscript = transcript.trim();
	if (!nextTranscript) return baseText;

	const trimmedBase = baseText.trimEnd();
	if (!trimmedBase) return nextTranscript;

	return `${trimmedBase}\n\n${nextTranscript}`;
}

function normalizeTranscript(transcript: string) {
	//
	return transcript
		.replace(/\s+([,.!?;:])/g, '$1')
		.replace(/\s{2,}/g, ' ')
		.trim();
}

function extractDictionary(text: string) {
	//
	const terms = text.match(/[A-Za-z][A-Za-z0-9_.$:/-]{2,}/g) ?? [];
	const highSignalTerms = terms.filter((term) => /[A-Z0-9_.$:/-]/.test(term) || term.length > 12);

	return Array.from(new Set(highSignalTerms)).slice(0, 32);
}
