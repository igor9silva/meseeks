import { Square, X } from 'lucide-react';
import { ActionButton } from '@reactor/ui/action-button';
import { TextShimmer } from '@reactor/ui/text-shimmer';
import type { RecordingStatus } from '~/hooks/useVoiceRecording';

export function RecordingState({
	status = 'recording',
	transcript,
	stopRecording,
	cancelRecording,
}: {
	status?: Exclude<RecordingStatus, 'idle'>;
	transcript?: string;
	stopRecording: () => void;
	cancelRecording: () => void;
}) {
	//
	const canStop = status === 'recording';
	const statusText = getStatusText(status);
	const preview = transcript?.trim();

	return (
		<>
			<div className="flex min-w-0 flex-grow flex-col justify-center gap-2 px-2">
				<TextShimmer text={statusText} size={preview ? 'sm' : 'lg'} />
				{preview && (
					<div className="text-primary max-h-36 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-border/50 bg-background/40 px-3 py-2 text-sm leading-relaxed">
						{preview}
					</div>
				)}
			</div>

			<div className="flex items-center justify-between gap-2 pt-2">
				<div className="flex items-center gap-2">{/* Empty div to maintain layout consistency */}</div>

				<div className="flex items-center gap-2">
					{canStop && (
						<ActionButton
							icon={<Square className="size-5" />}
							onClick={stopRecording}
							tooltip="Stop & transcribe"
							variant="secondary"
						/>
					)}
					<ActionButton
						icon={<X className="size-5" />}
						onClick={cancelRecording}
						tooltip="Cancel transcription"
						variant="destructive"
					/>
				</div>
			</div>
		</>
	);
}

function getStatusText(status: Exclude<RecordingStatus, 'idle'>) {
	//
	if (status === 'connecting') return 'Starting live transcription...';
	if (status === 'transcribing') return 'Finishing transcript...';
	return 'Listening live...';
}
