import type { Doc, Id } from 'convex/_generated/dataModel';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { INTELLIGENCES, intelligenceKeys } from 'schemas/intelligenceSchema';
import { Button } from '@reactor/ui/button';
import { Label } from '@reactor/ui/label';
import { Textarea } from '@reactor/ui/textarea';
import { useAct } from '~/hooks/useAct';
import { useRootSkills } from '~/hooks/query/useSkills';
import { absolutePath } from './path';
import { Result, formatError, formatJson, parseObject } from './shared';

export function ReactorPanel({
	currentPath,
	root,
	selectedFile,
}: {
	currentPath: string;
	root: Id<'files'>;
	selectedFile?: Doc<'files'>;
}) {
	//
	const { act, isActing } = useAct();
	const { skills } = useRootSkills(root);
	const actionTemplates = templates({ currentPath, root, selectedFile });
	const [skill, setSkill] = useState('say');
	const [intelligence, setIntelligence] = useState('');
	const [input, setInput] = useState(formatJson({ message: 'hello from /' }));
	const [result, setResult] = useState('');

	const handleSubmit = async (event: FormEvent) => {
		//
		event.preventDefault();

		try {
			const parsedInput = parseObject(input);
			const parsedIntelligence = intelligenceKeys.safeParse(intelligence);
			const next = await act([
				{
					root,
					skill,
					intelligence: parsedIntelligence.success ? parsedIntelligence.data : undefined,
					input: parsedInput,
				},
			]);
			setResult(formatJson(next));
		} catch (error) {
			setResult(formatError(error));
		}
	};

	const applyTemplate = (nextSkill: string, nextInput: unknown) => {
		//
		setSkill(nextSkill);
		setInput(formatJson(nextInput));
		setResult('');
	};

	const handleSkillChange = (nextSkill: string) => {
		//
		setSkill(nextSkill);
		setResult('');

		const template = actionTemplates.find((item) => item.skill === nextSkill);
		if (template) setInput(formatJson(template.input));
	};

	return (
		<form className="grid gap-3 rounded-md border bg-card p-3" onSubmit={handleSubmit}>
			<div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
				<div className="grid gap-1">
					<Label htmlFor="skill" className="text-xs">
						skill
					</Label>
					<select
						id="skill"
						data-testid="test-console-skill"
						className="h-9 rounded-md border bg-background px-3 text-sm"
						value={skill}
						onChange={(event) => handleSkillChange(event.target.value)}
					>
						{skills.length === 0 ? <option value={skill}>{skill}</option> : null}
						{skills.map((item) => (
							<option key={item._id} value={item.key}>
								{item.key} · {item.source}
							</option>
						))}
					</select>
				</div>
				<div className="grid gap-1">
					<Label htmlFor="intelligence" className="text-xs">
						intelligence
					</Label>
					<select
						id="intelligence"
						data-testid="test-console-intelligence"
						className="h-9 rounded-md border bg-background px-3 text-sm"
						value={intelligence}
						onChange={(event) => setIntelligence(event.target.value)}
					>
						<option value="">skill default</option>
						{Object.values(INTELLIGENCES).map((item) => (
							<option key={item.key} value={item.key}>
								{item.name}
							</option>
						))}
					</select>
				</div>
				<Button type="submit" disabled={isActing} data-testid="test-console-run-action">
					Run
				</Button>
			</div>

			<div className="flex flex-wrap gap-2">
				{actionTemplates.map((template) => (
					<Button
						key={template.label}
						type="button"
						size="sm"
						variant={skill === template.skill ? 'secondary' : 'outline'}
						onClick={() => applyTemplate(template.skill, template.input)}
					>
						{template.label}
					</Button>
				))}
			</div>

			<Textarea
				className="min-h-40 font-mono text-xs"
				value={input}
				onChange={(event) => setInput(event.target.value)}
			/>
			<Result value={result} />
		</form>
	);
}

function templates({
	currentPath,
	root,
	selectedFile,
}: {
	currentPath: string;
	root: Id<'files'>;
	selectedFile?: Doc<'files'>;
}) {
	//
	return [
		{ skill: 'say', label: 'say', input: { message: `hello from ${absolutePath(currentPath)}` } },
		{
			skill: 'create',
			label: 'create',
			input: {
				kind: 'file',
				parentId: root,
				name: `from-reactor-${Date.now()}.md`,
				content: '# From Reactor\n',
				contentType: 'text/markdown; charset=utf-8',
			},
		},
		{
			skill: 'write',
			label: 'write',
			input: {
				fileId: selectedFile?._id ?? 'select-a-file-first',
				content: '# Reactor write\n',
				contentType: selectedFile?.contentType ?? 'text/markdown; charset=utf-8',
				expectedRevisionId: selectedFile?.currentRevision,
			},
		},
		{
			skill: 'tag',
			label: 'tag',
			input: {
				fileId: selectedFile?._id ?? 'select-a-file-first',
				key: 'kind',
				value: 'task',
			},
		},
		{
			skill: 'untag',
			label: 'untag',
			input: {
				fileId: selectedFile?._id ?? 'select-a-file-first',
				key: 'kind',
			},
		},
		{
			skill: 'move',
			label: 'move',
			input: {
				fileId: selectedFile?._id ?? 'select-a-file-first',
				parentId: root,
				name: selectedFile ? `moved-${selectedFile.name}` : 'moved-file.md',
			},
		},
		{ skill: 'request', label: 'request', input: { url: 'https://example.com', method: 'GET' } },
		{
			skill: 'think',
			label: 'think',
			input: {
				prompt: `Write one concise MDX note about ${absolutePath(currentPath)}.`,
			},
		},
		{ skill: 'execute', label: 'execute', input: { language: 'python', code: "print('not wired yet')" } },
		{ skill: 'compile', label: 'compile', input: {} },
	];
}
