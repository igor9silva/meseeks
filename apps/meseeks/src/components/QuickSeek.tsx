import { useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@reactor/ui/lib/utils';

import { INSUFFICIENT_ACCOUNT_FUNDS_ERROR, isError } from 'lib/errors';
import { INTELLIGENCE_PROGRESSION, intelligenceKeys, type IntelligenceKey } from 'schemas/intelligenceSchema';
import { useKeyboardShortcut } from '@reactor/ui/hooks/useKeyboardShortcuts';
import { BudgetSelector } from '~/components/BudgetSelector';
import { Composer, type ComposerHandle } from '~/components/Composer';
import { IntelligenceSelector } from '~/components/IntelligenceSelector';
import { Loading } from '~/components/Loading';
import { SkillsLink } from '~/components/SkillsLink';
import { useAddTask } from '~/hooks/useTaskMutations';

const PLACEHOLDERS = [
	"What's happening?",
	"What's going on?",
	'What troubles you?',
	'What are you thinking about?',
	'Siree, look at me!',
	'What are you feeling?',
	'What are you trying to achieve?',
	'What is my purpose?',
];

export function QuickSeek({ className }: { className?: string }) {
	return (
		<div className={cn('flex h-full flex-col items-center justify-end md:justify-center', className)}>
			<QuickSeekContent className="w-full max-w-5xl" />
		</div>
	);
}

export function QuickSeekContent({ className }: { className?: string }) {
	const navigate = useNavigate();
	const { addTask, isAdding } = useAddTask();
	const composerRef = useRef<ComposerHandle>(null);
	const intelligenceSelectorRef = useRef<HTMLButtonElement>(null);

	const { q } = useSearch({ strict: false });
	const initialMessage = typeof q === 'string' ? q : '';

	const [message, setMessage] = useState(initialMessage);
	const [intelligence, setIntelligence] = useState<IntelligenceKey | undefined>(undefined);
	const [initialFunds, setInitialFunds] = useState(0.2);
	const [hasUserSelectedIntelligence, setHasUserSelectedIntelligence] = useState(false);

	useEffect(() => {
		setMessage(initialMessage);
	}, [initialMessage]);

	useEffect(() => {
		if (!hasUserSelectedIntelligence) {
			setIntelligence(getIntelligenceForBudget(initialFunds));
		}
	}, [initialFunds, hasUserSelectedIntelligence]);

	const handleIntelligenceChange = (newIntelligence: IntelligenceKey) => {
		setIntelligence(newIntelligence);
		setHasUserSelectedIntelligence(true);
	};

	const placeholder = useMemo(() => PLACEHOLDERS[0] ?? "What's happening?", []);
	const isMessageEmpty = message.trim().length === 0;
	const voiceDictionary = useMemo(() => extractDictionaryTerms(message), [message]);

	const handleSubmit = () => {
		if (isAdding) return;
		if (isMessageEmpty) {
			toast.error('Message is required');
			return;
		}

		addTask(
			{
				message: message.trim(),
				initialFunds,
				intelligence,
			},
			{
				onSuccess: (taskId) => {
					navigate({ to: '/$', params: { _splat: `task/${taskId}` } });
				},
				onError: (error: unknown) => {
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
	};

	useKeyboardShortcut({
		global: true,
		combo: { withCommand: true, key: 'i' },
		callback: () => composerRef.current?.focusEnd(),
	});

	useKeyboardShortcut({
		global: true,
		combo: { withCommand: true, key: '/' },
		callback: () => intelligenceSelectorRef.current?.click(),
	});

	if (isAdding) return <Loading />;

	return (
		<div className={cn('max-h-fit p-4', className)}>
			<Composer
				ref={composerRef}
				value={message}
				onValueChange={setMessage}
				onSubmit={handleSubmit}
				placeholder={placeholder}
				promptContext={message ? `Draft: ${message}` : undefined}
				dictionary={voiceDictionary}
				className="mx-0 mb-0 p-4"
				textareaClassName="min-h-20"
				leadingControls={
					<BudgetSelector
						value={initialFunds}
						onChange={setInitialFunds}
						label="Max. energy"
						inputTabIndex={-1}
						className="flex-1"
					/>
				}
				secondaryControls={
					<>
						<IntelligenceSelector
							value={intelligence}
							onChange={handleIntelligenceChange}
							ref={intelligenceSelectorRef}
							className="min-w-0 flex-shrink"
						/>
						<SkillsLink />
					</>
				}
				submitTooltip="Seek"
				submitDisabled={isAdding || isMessageEmpty}
				submitShortcutScope="global"
				showShortcutHints={false}
			/>
		</div>
	);
}

function getIntelligenceForBudget(budget: number) {
	for (const [key, budgetThreshold] of Object.entries(INTELLIGENCE_PROGRESSION)) {
		const parsedKey = intelligenceKeys.safeParse(key);
		if (!parsedKey.success) continue;
		if (budget <= budgetThreshold) return parsedKey.data;
	}

	throw new Error(`Invalid intelligence progression setup for budget ${budget}`);
}

function extractDictionaryTerms(value: string) {
	return Array.from(value.matchAll(/\b[A-Z][A-Za-z0-9]*(?:[.-][A-Za-z0-9]+)*\b|[A-Z]{2,}\b/g), (match) => match[0])
		.filter((term) => term.length > 1)
		.slice(0, 40);
}
