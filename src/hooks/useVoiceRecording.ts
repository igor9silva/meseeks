import { api } from 'convex/_generated/api';
import { useAction } from 'convex/react';
import { useCallback, useEffect, useRef, useState } from 'react';

type RecordingStatus = 'idle' | 'recording' | 'transcribing';

interface UseVoiceRecordingProps {
	onTranscriptionComplete: (text: string) => void;
}

export function useVoiceRecording({ onTranscriptionComplete }: UseVoiceRecordingProps) {
	//
	const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>('idle');
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const audioChunksRef = useRef<Blob[]>([]);
	const streamRef = useRef<MediaStream | null>(null);
	const transcribe = useAction(api.magicRock.public.transcribeAudio);

	const currentStatusRef = useRef<RecordingStatus>('idle');

	const updateRecordingStatus = useCallback((newStatus: RecordingStatus) => {
		//
		currentStatusRef.current = newStatus;
		setRecordingStatus(newStatus);
		//
	}, []);

	const handleAudioTranscription = async (blob: Blob) => {
		//
		if (currentStatusRef.current === 'idle') return;

		updateRecordingStatus('transcribing');

		try {
			const text = await transcribe({ audio: await blob.arrayBuffer() });

			if (currentStatusRef.current === 'transcribing') {
				onTranscriptionComplete(text);
			}
			//
		} catch (error) {
			console.error('Error transcribing audio:', error);
			// TODO: handle error in the UI
		} finally {
			updateRecordingStatus('idle');
		}
	};

	const startRecording = useCallback(async () => {
		//
		try {
			// Check if MediaRecorder is available
			if (typeof MediaRecorder === 'undefined') {
				console.error('MediaRecorder is not available in this browser');
				alert('Your browser does not support audio recording.'); // TODO: better UI handling
				return;
			}

			console.debug('Requesting microphone access...');
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			streamRef.current = stream;
			console.debug('Microphone access granted!');

			mediaRecorderRef.current = new MediaRecorder(stream);
			audioChunksRef.current = [];

			mediaRecorderRef.current.addEventListener('start', () => {
				updateRecordingStatus('recording');
			});

			mediaRecorderRef.current.addEventListener('dataavailable', (event) => {
				if (event.data.size > 0) {
					audioChunksRef.current.push(event.data);
				}
			});

			mediaRecorderRef.current.addEventListener('stop', () => {
				//
				if (currentStatusRef.current === 'idle') return;

				// Combine chunks into a single blob
				const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

				// Process the audio
				handleAudioTranscription(blob);
			});

			mediaRecorderRef.current.addEventListener('error', (error) => {
				console.error('Error in MediaRecorder:', error);
				updateRecordingStatus('idle');
				// TODO: handle error in the UI
			});

			mediaRecorderRef.current.start();
			//
		} catch (error) {
			console.error('Error starting recording:', error);
			updateRecordingStatus('idle');
			// TODO: handle error in the UI
		}
	}, [updateRecordingStatus]);

	const stopRecording = useCallback(() => {
		//
		if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
			mediaRecorderRef.current.stop();
		}

		if (streamRef.current) {
			streamRef.current.getTracks().forEach((track) => track.stop());
			streamRef.current = null;
		}
		//
	}, []);

	const cancelRecording = useCallback(() => {
		//
		updateRecordingStatus('idle');

		if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
			mediaRecorderRef.current.stop();
		}

		if (streamRef.current) {
			streamRef.current.getTracks().forEach((track) => track.stop());
			streamRef.current = null;
		}
		//
	}, [updateRecordingStatus]);

	useEffect(() => {
		if (streamRef.current) {
			streamRef.current.getTracks().forEach((track) => track.stop());
		}
	}, []);

	return {
		recordingStatus,
		startRecording,
		stopRecording: () => {
			//
			if (currentStatusRef.current === 'transcribing') {
				// important to ignore transcribing result
				updateRecordingStatus('idle');
			}

			stopRecording();
		},
		cancelRecording,
	};
}
