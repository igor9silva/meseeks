import { useNavigate, useSearch } from '@tanstack/react-router';
import { api } from 'convex/_generated/api';
import { asBigInt } from 'convex/lib/money';
import { useMutation } from 'convex/react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { cn } from '~/lib/utils';

import { INSUFFICIENT_ACCOUNT_FUNDS_ERROR, isError } from 'convex/lib/errors';
import { modelsSchema } from 'convex/schemas/skillSchema';
import { ArrowUp, Mic } from 'lucide-react';
import { RecordingState } from '~/components/ActionComposer/RecordingState';
import { TranscribingState } from '~/components/ActionComposer/TranscribingState';
import { IntelligenceSelector } from '~/components/IntelligenceSelector';
import { SkillsLink } from '~/components/SkillsLink';
import { ActionButton } from '~/components/ui/action-button';
import { BudgetSelector, type BudgetStep } from '~/components/ui/budget-selector';
import { Card, CardContent } from '~/components/ui/card';
import { TooltipProvider } from '~/components/ui/tooltip';
import { useExpandingTextarea } from '~/hooks/useExpandingTextarea';
import { useKeyboardShortcut } from '~/hooks/useKeyboardShortcuts';
import { useVoiceRecording } from '~/hooks/useVoiceRecording';

export function QuickSeek({ className }: { className?: string }) {
	//
	return (
		<div className="h-full flex flex-col justify-end items-center md:justify-center">
			<QuickSeekContent className="w-full max-w-5xl" />
		</div>
	);
}

export function QuickSeekContent({ className }: { className?: string }) {
	//
	const navigate = useNavigate();
	const addTask = useMutation(api.tasks.public.add);
	const intelligenceSelectorRef = useRef<HTMLButtonElement>(null);

	const { q } = useSearch({ strict: false });

	const [intelligence, setIntelligence] = useState<z.infer<typeof modelsSchema> | undefined>(undefined);
	const [initialFunds, setInitialFunds] = useState<BudgetStep>(0.5);

	const {
		textareaRef,
		value: message,
		isEmpty,
		onChange: handleMessageChange,
		setValue: setMessage,
	} = useExpandingTextarea({ initialValue: q || '' });

	const { recordingStatus, startRecording, stopRecording, cancelRecording } = useVoiceRecording({
		onTranscriptionComplete: setMessage,
	});

	const placeholder = useMemo(randomPlaceholder, []);

	const handleStartRecording = async () => {
		try {
			await startRecording();
		} catch (error) {
			console.error('Failed to start voice recording:', error);
		}
	};

	const handleSubmit = async () => {
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
	};

	const showVoiceInterface = recordingStatus !== 'idle';

	// Handle CMD+Enter shortcut like ActionComposer
	useKeyboardShortcut({
		global: false, // Only when this component is focused
		combo: { withCommand: true, key: 'Enter' },
		callback: () => {
			if (recordingStatus === 'idle' && !isEmpty) {
				handleSubmit();
			}
		},
	});

	// global focus shortcut (CMD+I)
	useKeyboardShortcut({
		global: true,
		combo: { withCommand: true, key: 'i' },
		callback: () => textareaRef.current?.focus(),
	});

	// intelligence selector shortcut (CMD+/)
	useKeyboardShortcut({
		global: true,
		combo: { withCommand: true, key: '/' },
		callback: () => intelligenceSelectorRef.current?.click(),
	});

	return (
		<Card className={cn('max-h-fit border-none rounded-none p-4', className)}>
			<CardContent className="p-0">
				<TooltipProvider>
					<div
						className={cn(
							'bg-sidebar rounded-3xl border p-4 shadow-xs flex flex-col',
							showVoiceInterface && 'flex-row',
						)}
					>
						{'recording' === recordingStatus && (
							<RecordingState stopRecording={stopRecording} cancelRecording={cancelRecording} />
						)}

						{'transcribing' === recordingStatus && <TranscribingState cancelRecording={cancelRecording} />}

						{'idle' === recordingStatus && (
							<>
								<div className="flex items-center justify-center">
									<textarea
										ref={textareaRef}
										value={message}
										onChange={handleMessageChange}
										placeholder={placeholder}
										className="text-primary min-h-20 py-2 w-full resize-none border-none bg-transparent shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
									/>
								</div>

								<div className="flex flex-col md:flex-row gap-2 pt-2">
									{/* Budget selector - takes available space */}
									<div className="flex items-center gap-2 flex-1 md:min-w-0">
										<BudgetSelector
											value={initialFunds}
											onChange={setInitialFunds}
											className="flex-1"
										/>
									</div>

									{/* Other controls and action buttons */}
									<div className="flex items-center justify-between md:justify-end gap-2 flex-shrink-0">
										<div className="flex items-center gap-2 min-w-0">
											<IntelligenceSelector
												value={intelligence}
												onChange={setIntelligence}
												ref={intelligenceSelectorRef}
												className="min-w-0 flex-shrink"
											/>
											<SkillsLink />
										</div>

										<div className="flex items-center gap-2">
											{/* Action buttons */}
											<ActionButton
												icon={<Mic className="size-5" />}
												onClick={handleStartRecording}
												tooltip="Transcribe voice"
												variant="secondary"
											/>
											<ActionButton
												icon={<ArrowUp className="size-5" />}
												onClick={handleSubmit}
												disabled={isEmpty}
												tooltip="Seek"
											/>
										</div>
									</div>
								</div>
							</>
						)}
					</div>
				</TooltipProvider>
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
