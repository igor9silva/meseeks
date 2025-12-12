import { useNavigate } from '@tanstack/react-router';
import { INSUFFICIENT_ACCOUNT_FUNDS_ERROR, isError } from 'convex/lib/errors';
import { INTELLIGENCE_PROGRESSION, type IntelligenceKey } from 'convex/schemas/intelligenceSchema';
import { ArrowUp, Mic } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { RecordingState } from '~/components/ActionComposer/RecordingState';
import { TranscribingState } from '~/components/ActionComposer/TranscribingState';
import { IntelligenceSelector } from '~/components/IntelligenceSelector';
import { ContextStrip } from '~/components/Launcher/ContextStrip';
import { Loading } from '~/components/Loading';
import { SkillsLink } from '~/components/SkillsLink';
import { ActionButton } from '~/components/ui/action-button';
import { BudgetSelector, type BudgetStep } from '~/components/ui/budget-selector';
import { TooltipProvider } from '~/components/ui/tooltip';
import { useExpandingTextarea } from '~/hooks/useExpandingTextarea';
import { useKeyboardShortcut } from '~/hooks/useKeyboardShortcuts';
import { type LauncherContext } from '~/hooks/useLauncher';
import { useAddTask, useSay } from '~/hooks/useTaskMutations';
import { useVoiceRecording } from '~/hooks/useVoiceRecording';
import { cn } from '~/lib/utils';

interface LauncherComposerProps {
	//
	context: LauncherContext;
	onClose: () => void;
	className?: string;
}

export function LauncherComposer({ context, onClose, className }: LauncherComposerProps) {
	//
	const navigate = useNavigate();
	const { addTask, isAdding } = useAddTask();
	const { say, isSaying } = useSay();
	const intelligenceSelectorRef = useRef<HTMLButtonElement>(null);

	const [intelligence, setIntelligence] = useState<IntelligenceKey | undefined>(undefined);
	const [initialFunds, setInitialFunds] = useState<BudgetStep>(0.2);
	const [hasUserSelectedIntelligence, setHasUserSelectedIntelligence] = useState(false);

	const isExistingTask = Boolean(context.taskId);

	// automatically set intelligence based on budget unless user has manually selected one
	useEffect(() => {
		if (!hasUserSelectedIntelligence && !isExistingTask) {
			const suggestedIntelligence = getIntelligenceForBudget(initialFunds);
			setIntelligence(suggestedIntelligence);
		}
	}, [initialFunds, hasUserSelectedIntelligence, isExistingTask]);

	// use task's preferred intelligence if available
	useEffect(() => {
		if (context.task?.preferredIntelligence) {
			setIntelligence(context.task.preferredIntelligence);
		}
	}, [context.task?.preferredIntelligence]);

	const handleIntelligenceChange = (newIntelligence: IntelligenceKey) => {
		//
		setIntelligence(newIntelligence);
		setHasUserSelectedIntelligence(true);
	};

	const {
		textareaRef,
		value: message,
		isEmpty,
		onChange: handleMessageChange,
		setValue: setMessage,
	} = useExpandingTextarea({ initialValue: '' });

	const { recordingStatus, startRecording, stopRecording, cancelRecording } = useVoiceRecording({
		onTranscriptionComplete: setMessage,
	});

	const placeholder = useMemo(() => {
		if (isExistingTask) return 'What would you like to say?';
		return randomPlaceholder();
	}, [isExistingTask]);

	const handleStartRecording = async () => {
		try {
			await startRecording();
		} catch (error) {
			console.error('Failed to start voice recording:', error);
		}
	};

	const isPending = isAdding || isSaying;

	const handleSubmit = () => {
		//
		if (isPending) return;
		if (!message.trim()) {
			toast.error('Message is required');
			return;
		}

		if (isExistingTask && context.taskId) {
			// say to existing task
			say(
				{ taskId: context.taskId, message: message.trim() },
				{
					onSuccess: () => {
						onClose();
						navigate({ to: '/$', params: { _splat: `/task/${context.taskId}` } });
					},
					onError: () => {
						toast.error('Failed to send message.');
					},
				},
			);
		} else {
			// create new task
			addTask(
				{
					message: message.trim(),
					initialFunds,
					intelligence,
				},
				{
					onSuccess: (taskId) => {
						onClose();
						navigate({ to: '/$', params: { _splat: `/task/${taskId}` } });
					},
					onError: (error: unknown) => {
						//
						if (isError(INSUFFICIENT_ACCOUNT_FUNDS_ERROR, error)) {
							toast.error('Account funds are insufficient.', {
								description: 'Top up or decrease the task energy budget.',
								action: {
									label: 'Top up',
									onClick: () => navigate({ to: '/top-up' }),
								},
							});
						} else {
							toast.error('An unknown error occurred while starting the task.');
						}
					},
				},
			);
		}
	};

	const showVoiceInterface = recordingStatus !== 'idle';

	// handle CMD+Enter to submit
	useKeyboardShortcut({
		global: true,
		combo: { withCommand: true, key: 'Enter' },
		callback: () => {
			if (recordingStatus === 'idle' && !isEmpty && !isPending) {
				handleSubmit();
			}
		},
	});

	// intelligence selector shortcut (CMD+/)
	useKeyboardShortcut({
		global: true,
		combo: { withCommand: true, key: '/' },
		callback: () => intelligenceSelectorRef.current?.click(),
	});

	// auto-focus on mount
	useEffect(() => {
		textareaRef.current?.focus();
	}, [textareaRef]);

	if (isPending) return <Loading className="py-8" />;

	return (
		<TooltipProvider>
			<div className={cn('flex flex-col', className)}>
				<ContextStrip task={context.task} />

				<div
					className={cn(
						'p-4 flex flex-col',
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
								{/* budget selector - only for new tasks */}
								{!isExistingTask && (
									<div className="flex items-center gap-2 flex-1 md:min-w-0">
										<BudgetSelector
											value={initialFunds}
											onChange={setInitialFunds}
											className="flex-1"
										/>
									</div>
								)}

								{/* controls and action buttons */}
								<div
									className={cn(
										'flex items-center justify-between md:justify-end gap-2 flex-shrink-0',
										isExistingTask && 'flex-1',
									)}
								>
									<div className="flex items-center gap-2 min-w-0">
										<IntelligenceSelector
											value={intelligence}
											onChange={handleIntelligenceChange}
											ref={intelligenceSelectorRef}
											className="min-w-0 flex-shrink"
										/>
										<SkillsLink />
									</div>

									<div className="flex items-center gap-2">
										<ActionButton
											icon={<Mic className="size-5" />}
											onClick={handleStartRecording}
											disabled={isPending}
											tooltip="Transcribe voice"
											variant="secondary"
										/>
										<ActionButton
											icon={<ArrowUp className="size-5" />}
											onClick={handleSubmit}
											disabled={isEmpty || isPending}
											tooltip={isExistingTask ? 'Send' : 'Start task'}
										/>
									</div>
								</div>
							</div>
						</>
					)}
				</div>
			</div>
		</TooltipProvider>
	);
}

function getIntelligenceForBudget(budget: BudgetStep) {
	//
	for (const [key, budgetThreshold] of Object.entries(INTELLIGENCE_PROGRESSION)) {
		if (budget <= budgetThreshold) {
			return key as IntelligenceKey;
		}
	}

	throw new Error(`Invalid intelligence progression setup for budget ${budget}`);
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
