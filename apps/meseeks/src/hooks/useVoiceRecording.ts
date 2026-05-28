import { useAction } from 'convex/react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { api } from 'convex/_generated/api';

type RecordingStatus = 'idle' | 'recording' | 'transcribing';

interface UseVoiceRecordingProps {
	onTranscriptionComplete: (text: string) => void;
}

export function useVoiceRecording({ onTranscriptionComplete }: UseVoiceRecordingProps) {
	//
	const transcribeAction = useAction(api.magicRock.transcribe);

	const streamRef = useRef<MediaStream | null>(null);
	const currentStatusRef = useRef<RecordingStatus>('idle');
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);

	const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>('idle');

	const updateStatus = (status: RecordingStatus) => {
		//
		currentStatusRef.current = status;
		setRecordingStatus(status);
	};

	const startRecording = async () => {
		//
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			streamRef.current = stream;

			const mediaRecorder = new MediaRecorder(stream);
			mediaRecorderRef.current = mediaRecorder;

			const chunks: Blob[] = [];

			mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					chunks.push(event.data);
				}
			};

			mediaRecorder.onstop = async () => {
				//
				const audio = new Blob(chunks, { type: mediaRecorder.mimeType });

				if (currentStatusRef.current === 'recording') {
					//
					updateStatus('transcribing');

					try {
						const audioBuffer = await audio.arrayBuffer();
						const transcriptionArgs = audio.type
							? { audio: audioBuffer, contentType: audio.type }
							: { audio: audioBuffer };
						const text = await transcribeAction(transcriptionArgs);
						onTranscriptionComplete(text);
					} catch (error) {
						console.error('Error transcribing audio:', error);
						toast.error('Failed to transcribe audio. Please try again.');
					}

					updateStatus('idle');
				}
			};

			mediaRecorder.start();
			updateStatus('recording');
			//
		} catch (error) {
			console.error('Error starting recording:', error);
			toast.error('Unable to access microphone. Please check your browser permissions.');
		}
		//
	};

	const stopRecording = () => {
		//
		if (mediaRecorderRef.current && currentStatusRef.current === 'recording') {
			mediaRecorderRef.current.stop();
		}

		if (streamRef.current) {
			streamRef.current.getTracks().forEach((track) => track.stop());
			streamRef.current = null;
		}
	};

	const cancelRecording = () => {
		updateStatus('idle');

		if (mediaRecorderRef.current) {
			mediaRecorderRef.current.stop();
		}

		if (streamRef.current) {
			streamRef.current.getTracks().forEach((track) => track.stop());
			streamRef.current = null;
		}
	};

	return {
		recordingStatus,
		startRecording,
		stopRecording,
		cancelRecording,
	};
}
