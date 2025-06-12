import { useNavigate, useSearch } from '@tanstack/react-router';
import { api } from 'convex/_generated/api';
import { useMutation } from 'convex/react';
import { asBigInt } from 'convex/utils/money';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { cn } from '~/lib/utils';

import { modelsSchema } from 'convex/schemas/skillSchema';
import { INSUFFICIENT_ACCOUNT_FUNDS_ERROR, isError } from 'convex/utils/errors';
import { KeyboardShortcutIndicator } from '~/components/ActionComposer/KeyboardShortcutIndicator';
import { IntelligenceSelector } from '~/components/IntelligenceSelector';
import { SkillsLink } from '~/components/SkillsLink';
import { BudgetSelector } from '~/components/ui/budget-selector';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Textarea } from '~/components/ui/textarea';
import { useHandleSubmit } from '~/hooks/useHandleSubmit';
import { useSubmitHotkey } from '~/hooks/useSubmitHotkey';

export function QuickAdd({ className }: { className?: string }) {
	//
	const navigate = useNavigate();
	const addTask = useMutation(api.tasks.public.add);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const { newTaskText } = useSearch({ strict: false });

	useEffect(() => {
		textareaRef.current?.focus();
	}, []);

	const handleSubmit = useHandleSubmit({
		schema: z.object({
			message: z.string().min(1, 'Message is required'),
			initialFunds: z.coerce.number().min(0).max(100000).default(0.2),
		}),
		shouldAlwaysClearForm: false,
		handler: async ({ message, initialFunds }) => {
			//
			console.debug('QuickAdd', message, initialFunds);

			try {
				//
				const taskId = await addTask({
					message,
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

	// confirm on CMD+Enter
	const handleKeyDown = useSubmitHotkey();

	const [intelligence, setIntelligence] = useState<z.infer<typeof modelsSchema> | undefined>(undefined);

	return (
		<Card className={cn('max-h-fit border-none rounded-none p-4', className)}>
			<CardContent className="p-0">
				<form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="flex flex-col gap-6">
					<div className="flex flex-col gap-2">
						<Textarea
							ref={textareaRef}
							name="message"
							placeholder={randomPlaceholder()}
							required
							defaultValue={newTaskText}
							className="min-h-32 resize-none text-base"
						/>
					</div>
					<div className="flex flex-col md:flex-row gap-2 w-full">
						<BudgetSelector name="initialFunds" className="flex-1" />
						<div className="flex items-center gap-2 flex-1">
							<IntelligenceSelector value={intelligence} onChange={setIntelligence} className="flex-1" />
							<SkillsLink />
						</div>
					</div>
					<Button variant="default" type="submit" size="lg">
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
