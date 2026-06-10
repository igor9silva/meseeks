import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation } from 'convex/react';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { z } from 'zod/v3';
import { api } from 'convex/_generated/api';
import { Button } from '@reactor/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@reactor/ui/card';
import { Input } from '@reactor/ui/input';
import { Label } from '@reactor/ui/label';
import { Textarea } from '@reactor/ui/textarea';
import { skillInputArgumentSchema, storedSkillKindSchema } from 'schemas/skillSchema';

export const Route = createFileRoute('/skills_/new')({
	component: NewSkillPage,
});

function NewSkillPage() {
	//
	const navigate = useNavigate();
	const createSkill = useMutation(api.skills.create);
	const [key, setKey] = useState('');
	const [name, setName] = useState('');
	const [kind, setKind] = useState<z.infer<typeof storedSkillKindSchema>>('think');
	const [inputText, setInputText] = useState('[]');
	const [body, setBody] = useState('');
	const [method, setMethod] = useState('GET');
	const [url, setUrl] = useState('');
	const [command, setCommand] = useState('');
	const [isSaving, setIsSaving] = useState(false);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const parsedKind = storedSkillKindSchema.safeParse(kind);
		if (!parsedKind.success) return;
		const parsedInput = parseInputArguments(inputText);
		if (!parsedInput.success) return;

		setIsSaving(true);
		try {
			const skill = await createSkill({
				key,
				name: name.trim() || key,
				kind: parsedKind.data,
				input: parsedInput.data,
				body,
				method: parsedKind.data === 'request' ? requestMethod(method) : undefined,
				url: parsedKind.data === 'request' ? url : undefined,
				command: parsedKind.data === 'execute' ? command : undefined,
			});
			await navigate({ to: '/skills/$id', params: { id: skill } });
		} finally {
			setIsSaving(false);
		}
	};

	const handleKindChange = (event: ChangeEvent<HTMLSelectElement>) => {
		//
		const parsed = storedSkillKindSchema.safeParse(event.currentTarget.value);
		if (parsed.success) setKind(parsed.data);
	};

	return (
		<div className="h-full overflow-auto">
			<form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 md:p-6">
				<Card>
					<CardHeader>
						<CardTitle>New skill</CardTitle>
						<CardDescription>Skills point to one VFS file body.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-2">
							<Label htmlFor="key">Key</Label>
							<Input id="key" value={key} onChange={(event) => setKey(event.currentTarget.value)} />
						</div>
						<div className="grid gap-2">
							<Label htmlFor="input">Input arguments</Label>
							<Textarea
								id="input"
								value={inputText}
								onChange={(event) => setInputText(event.currentTarget.value)}
								className="min-h-32 font-mono text-sm"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="name">Name</Label>
							<Input id="name" value={name} onChange={(event) => setName(event.currentTarget.value)} />
						</div>
						<div className="grid gap-2">
							<Label htmlFor="kind">Kind</Label>
							<select
								id="kind"
								value={kind}
								onChange={handleKindChange}
								className="h-10 rounded-md border border-input bg-background px-3 text-sm"
							>
								<option value="think">think</option>
								<option value="request">request</option>
								<option value="execute">execute</option>
							</select>
						</div>
						{kind === 'request' && (
							<>
								<div className="grid gap-2">
									<Label htmlFor="method">Method</Label>
									<select
										id="method"
										value={method}
										onChange={(event) => setMethod(event.currentTarget.value)}
										className="h-10 rounded-md border border-input bg-background px-3 text-sm"
									>
										<option value="GET">GET</option>
										<option value="POST">POST</option>
										<option value="PUT">PUT</option>
										<option value="PATCH">PATCH</option>
										<option value="DELETE">DELETE</option>
									</select>
								</div>
								<div className="grid gap-2">
									<Label htmlFor="url">URL</Label>
									<Input
										id="url"
										value={url}
										onChange={(event) => setUrl(event.currentTarget.value)}
									/>
								</div>
							</>
						)}
						{kind === 'execute' && (
							<div className="grid gap-2">
								<Label htmlFor="command">Command</Label>
								<Input
									id="command"
									value={command}
									onChange={(event) => setCommand(event.currentTarget.value)}
								/>
							</div>
						)}
						<div className="grid gap-2">
							<Label htmlFor="body">File body</Label>
							<Textarea
								id="body"
								value={body}
								onChange={(event) => setBody(event.currentTarget.value)}
								className="min-h-64 font-mono text-sm"
							/>
						</div>
						<Button type="submit" disabled={isSaving || !key.trim()}>
							{isSaving ? 'Saving...' : 'Create'}
						</Button>
					</CardContent>
				</Card>
			</form>
		</div>
	);
}

function requestMethod(value: string) {
	//
	return z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).parse(value);
}

function parseInputArguments(value: string) {
	//
	try {
		return z.array(skillInputArgumentSchema).safeParse(JSON.parse(value));
	} catch {
		return z.array(skillInputArgumentSchema).safeParse(undefined);
	}
}
