import { Link } from '@tanstack/react-router';
import { zid } from 'convex-helpers/server/zod3';
import { useState, type FormEvent } from 'react';
import { z } from 'zod/v3';
import { toast } from 'sonner';
import { Button } from '@reactor/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@reactor/ui/card';
import { Input } from '@reactor/ui/input';
import { Label } from '@reactor/ui/label';
import { Textarea } from '@reactor/ui/textarea';
import { useAct } from '~/hooks/useAct';
import { useCurrentUser } from '~/hooks/useCurrentUser';

interface SkillRunCardProps {
	//
	skillKey: string;
	defaultArgs?: Record<string, unknown>;
}

const actionArgsSchema = z.record(z.unknown());

export function SkillRunCard({ skillKey, defaultArgs = {} }: SkillRunCardProps) {
	//
	const currentUser = useCurrentUser();
	const { act, isPending } = useAct();
	const [fileId, setFileId] = useState(currentUser.rootFileId ?? '');
	const [argsText, setArgsText] = useState(JSON.stringify(defaultArgs, null, 2));
	const [lastActionId, setLastActionId] = useState<string | null>(null);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		//
		event.preventDefault();
		const parsedFile = zid('files').safeParse(fileId);
		if (!parsedFile.success) {
			toast.error('File id is invalid.');
			return;
		}

		const parsedArgs = parseActionArgs(argsText);
		if (!parsedArgs.success) {
			toast.error('Arguments must be a JSON object.');
			return;
		}

		const actionIds = await act({
			fileId: parsedFile.data,
			skills: [
				{
					skillKey,
					args: parsedArgs.data,
					source: 'quick-action',
				},
			],
			shouldReopen: true,
		});
		const firstActionId = actionIds.at(0);
		setLastActionId(firstActionId ?? null);
		toast.success(firstActionId ? 'Action created.' : 'No action was created.');
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Run</CardTitle>
				<CardDescription>Run this skill on a file through the public action API.</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="space-y-3">
					<div className="grid gap-2">
						<Label htmlFor={`${skillKey}-run-file`}>File</Label>
						<Input
							id={`${skillKey}-run-file`}
							value={fileId}
							onChange={(event) => setFileId(event.currentTarget.value)}
							className="font-mono text-xs"
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor={`${skillKey}-run-args`}>Arguments</Label>
						<Textarea
							id={`${skillKey}-run-args`}
							value={argsText}
							onChange={(event) => setArgsText(event.currentTarget.value)}
							className="min-h-40 font-mono text-xs"
						/>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Button type="submit" disabled={isPending || !fileId}>
							{isPending ? 'Running...' : 'Run'}
						</Button>
						{lastActionId && (
							<Button asChild variant="outline">
								<Link to="/action/$id" params={{ id: lastActionId }}>
									Open action
								</Link>
							</Button>
						)}
					</div>
				</form>
			</CardContent>
		</Card>
	);
}

function parseActionArgs(value: string) {
	//
	try {
		return actionArgsSchema.safeParse(JSON.parse(value));
	} catch {
		return actionArgsSchema.safeParse(undefined);
	}
}
