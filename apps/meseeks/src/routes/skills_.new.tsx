import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation } from 'convex/react';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { z } from 'zod/v3';
import { api } from 'convex/_generated/api';
import { Button } from '@pro/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@pro/ui/card';
import { Input } from '@pro/ui/input';
import { Label } from '@pro/ui/label';
import { Textarea } from '@pro/ui/textarea';
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
	const [kind, setKind] = useState<z.infer<typeof storedSkillKindSchema>>('soft');
	const [inputText, setInputText] = useState('[]');
	const [body, setBody] = useState('');
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
								<option value="soft">soft</option>
								<option value="code">code</option>
							</select>
						</div>
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

function parseInputArguments(value: string) {
	//
	try {
		return z.array(skillInputArgumentSchema).safeParse(JSON.parse(value));
	} catch {
		return z.array(skillInputArgumentSchema).safeParse(undefined);
	}
}
