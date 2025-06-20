import { useNavigate, useSearch } from '@tanstack/react-router';
import { api } from 'convex/_generated/api';
import { asBigInt } from 'convex/lib/money';
import { useMutation } from 'convex/react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { cn } from '~/lib/utils';

import { INSUFFICIENT_ACCOUNT_FUNDS_ERROR, isError } from 'convex/lib/errors';
import { modelsSchema } from 'convex/schemas/skillSchema';
import { Mic } from 'lucide-react';
import { KeyboardShortcutIndicator } from '~/components/ActionComposer/KeyboardShortcutIndicator';
import { RecordingState } from '~/components/ActionComposer/RecordingState';
import { TranscribingState } from '~/components/ActionComposer/TranscribingState';
import { IntelligenceSelector } from '~/components/IntelligenceSelector';
import { SkillsLink } from '~/components/SkillsLink';
import { ActionButton } from '~/components/ui/action-button';
import { BudgetSelector } from '~/components/ui/budget-selector';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { TooltipProvider } from '~/components/ui/tooltip';
import { useHandleSubmit } from '~/hooks/useHandleSubmit';
import { useKeyboardShortcut } from '~/hooks/useKeyboardShortcuts';
import { useVoiceRecording } from '~/hooks/useVoiceRecording';

export function QuickAdd({ className }: { className?: string }) {
	//
	const navigate = useNavigate();
	const addTask = useMutation(api.tasks.public.add);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const { q } = useSearch({ strict: false });

	const [message, setMessage] = useState(q || '');
	const [intelligence, setIntelligence] = useState<z.infer<typeof modelsSchema> | undefined>(undefined);

	const { recordingStatus, startRecording, stopRecording, cancelRecording } = useVoiceRecording({
		onTranscriptionComplete: setMessage,
	});

	const handleStartRecording = async () => {
		try {
			await startRecording();
		} catch (error) {
			console.error('Failed to start voice recording:', error);
		}
	};

	useEffect(() => {
		textareaRef.current?.focus();
	}, []);

	const handleSubmit = useHandleSubmit({
		schema: z.object({
			initialFunds: z.coerce.number().min(0).max(100000).default(0.2),
		}),
		shouldAlwaysClearForm: false,
		handler: async ({ initialFunds }) => {
			//
			if (!message.trim()) {
				toast.error('Message is required');
				return;
			}

			try {
				//
				const taskId = await addTask({
					message: message.trim(),
					initialFunds: asBigInt({ dollars: initialFunds }),
					preferredIntelligence: intelligence,
				});

				navigate({ to: '/$', params: { _splat: `/task/${taskId}` } });
				//
			} catch (error: unknown) {
				//
				if (isError(INSUFFICIENT_ACCOUNT_FUNDS_ERROR, error)) {
					toast.error('Account funds are insufficient.', {
						description: 'Top up or decrease the task budget.',
						action: {
							label: 'Top up',
							onClick: () => navigate({ to: '/top-up' }),
						},
					});
				} else {
					toast.error('An unknown error occurred while starting the task.');
				}
			}
		},
	});

	const showVoiceInterface = recordingStatus !== 'idle';
	const isEmpty = !message.trim();

	// Handle CMD+Enter shortcut like ActionComposer
	useKeyboardShortcut({
		global: false, // Only when this component is focused
		combo: { withCommand: true, key: 'Enter' },
		callback: () => {
			if (recordingStatus === 'idle' && !isEmpty) {
				const form = document.querySelector('form');
				if (form) form.requestSubmit();
			}
		},
	});

	return (
		<Card className={cn('max-h-fit border-none rounded-none p-4', className)}>
			<CardContent className="p-0">
				<TooltipProvider>
					<div
						className={cn(
							'bg-sidebar rounded-3xl border p-2 shadow-xs flex flex-col mb-6',
							showVoiceInterface && 'flex-row',
						)}
					>
						{'recording' === recordingStatus && (
							<RecordingState stopRecording={stopRecording} cancelRecording={cancelRecording} />
						)}

						{'transcribing' === recordingStatus && <TranscribingState cancelRecording={cancelRecording} />}

						{'idle' === recordingStatus && (
							<>
								<div className="flex flex-grow items-center justify-center px-3">
									<textarea
										ref={textareaRef}
										value={message}
										onChange={(e) => setMessage(e.target.value)}
										placeholder={randomPlaceholder()}
										className="text-primary min-h-14 py-2 w-full resize-none border-none bg-transparent shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
									/>
								</div>

								<div className="flex items-center justify-end gap-2 px-3 pt-2">
									<ActionButton
										icon={<Mic className="size-5" />}
										onClick={handleStartRecording}
										tooltip="Transcribe voice"
										variant="secondary"
									/>
								</div>
							</>
						)}
					</div>
				</TooltipProvider>

				<form onSubmit={handleSubmit} className="flex flex-col gap-6">
					<div className="flex flex-col md:flex-row gap-2 w-full">
						<BudgetSelector name="initialFunds" className="flex-1" />
						<div className="flex items-center gap-2 flex-1">
							<IntelligenceSelector value={intelligence} onChange={setIntelligence} className="flex-1" />
							<SkillsLink />
						</div>
					</div>
					<Button variant="default" type="submit" size="lg" disabled={isEmpty}>
						Seek
						<KeyboardShortcutIndicator keySymbol="⏎" className="bg-muted text-muted-foreground" />
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}

function randomPlaceholder() {
	//
	const placeholders = [
		"What's happening?",
		"What's going on?",
		'What troubles you?',
		'What are you thinking about?',
		'Siree, look at me!',
		'What are you feeling?',
		'What are you trying to achieve?',
		'What is my purpose?',
	];

	return placeholders[Math.floor(Math.random() * placeholders.length)];
}
