import type { Id } from 'convex/_generated/dataModel';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { fileRevisionChangeKindSchema } from 'schemas/fileRevisionSchema';
import type { z } from 'zod/v3';
import { Button } from '@reactor/ui/button';
import { Checkbox } from '@reactor/ui/checkbox';
import { Input } from '@reactor/ui/input';
import { Label } from '@reactor/ui/label';
import { Textarea } from '@reactor/ui/textarea';
import { useAct } from '~/hooks/useAct';
import { Result, formatError, formatJson, parseObject } from './shared';

type ChangeKind = z.infer<typeof fileRevisionChangeKindSchema>;

const mutationEvents: Array<ChangeKind> = [
	'create', //
	'update',
	'rename',
	'metadata',
	'tag',
];

export function TriggerActionPanel({ root }: { root: Id<'files'> }) {
	//
	return (
		<div className="rounded-md border bg-card p-3">
			<CreateTriggerForm root={root} />
		</div>
	);
}

function CreateTriggerForm({ root }: { root: Id<'files'> }) {
	//
	const { act, isActing } = useAct();
	const [events, setEvents] = useState<Array<ChangeKind>>(['create', 'update']);
	const [pattern, setPattern] = useState('*.md');
	const [skill, setSkill] = useState('say');
	const [input, setInput] = useState(formatJson({ message: 'trigger fired' }));
	const [result, setResult] = useState('');

	const handleSubmit = async (event: FormEvent) => {
		//
		event.preventDefault();
		const parsedInput = parseObject(input);

		try {
			const action = await act([
				{
					root,
					skill: 'createTrigger',
					input: {
						events,
						pattern: pattern.trim() || undefined,
						reactions: [
							{
								skill,
								input: parsedInput,
							},
						],
					},
				},
			]);
			setResult(formatJson(action));
		} catch (error) {
			setResult(formatError(error));
		}
	};

	const toggleEvent = (event: ChangeKind, checked: boolean) => {
		//
		if (checked) {
			setEvents(events.includes(event) ? events : events.concat(event));
			return;
		}

		setEvents(events.filter((item) => item !== event));
	};

	return (
		<form className="grid gap-3 rounded-md border p-3" onSubmit={handleSubmit}>
			<div className="grid gap-2">
				<Label>events</Label>
				<div className="flex flex-wrap gap-3">
					{mutationEvents.map((event) => (
						<label key={event} className="flex items-center gap-2 text-sm">
							<Checkbox
								checked={events.includes(event)}
								onCheckedChange={(checked) => toggleEvent(event, checked === true)}
							/>
							{event}
						</label>
					))}
				</div>
			</div>
			<div className="grid gap-2">
				<Label htmlFor="trigger-pattern">pattern</Label>
				<Input
					id="trigger-pattern"
					data-testid="test-console-trigger-pattern"
					value={pattern}
					onChange={(event) => setPattern(event.target.value)}
					placeholder="*.md"
				/>
			</div>
			<div className="grid gap-2">
				<Label htmlFor="trigger-skill">reaction skill</Label>
				<Input
					id="trigger-skill"
					data-testid="test-console-trigger-skill"
					value={skill}
					onChange={(event) => setSkill(event.target.value)}
				/>
			</div>
			<div className="grid gap-2">
				<Label htmlFor="trigger-input">reaction input</Label>
				<Textarea
					id="trigger-input"
					className="min-h-24 font-mono text-xs"
					data-testid="test-console-trigger-input"
					value={input}
					onChange={(event) => setInput(event.target.value)}
				/>
			</div>
			<Button type="submit" disabled={isActing || events.length === 0 || !skill.trim()}>
				Create trigger
			</Button>
			<Result value={result} />
		</form>
	);
}
