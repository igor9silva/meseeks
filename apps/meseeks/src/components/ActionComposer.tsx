import { Button, Input, Textarea } from '@reactor/ui';
import { useAction } from 'convex/react';
import { api } from 'convex/_generated/api';
import type { Id } from 'convex/_generated/dataModel';
import type { LucideIcon } from 'lucide-react';
import { CheckCircle2, ClipboardList, Code2, File, MessageSquare, RefreshCcw, Send, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { trustedIntelligences, type TrustedIntelligence } from 'lib/intelligences';
import { defaultExecuteCode } from './constants';
import { Section } from './Section';
import { shortId } from './utils';

type Mode = 'say' | 'think' | 'execute' | 'create' | 'createTask' | 'interrupt';

interface Option {
	//
	key: Mode;
	Icon: LucideIcon;
}

const modes: Option[] = [
	{ key: 'say', Icon: MessageSquare },
	{ key: 'think', Icon: Sparkles },
	{ key: 'execute', Icon: Code2 },
	{ key: 'create', Icon: File },
	{ key: 'createTask', Icon: ClipboardList },
	{ key: 'interrupt', Icon: CheckCircle2 },
];

const providerNames: Record<TrustedIntelligence['provider'], string> = {
	deepseek: 'DeepSeek',
	moonshot: 'Moonshot',
	openai: 'OpenAI',
};

interface Props {
	//
	directory: Id<'files'>;
	onDone: (message: string) => void;
}

export function ActionComposer({ directory, onDone }: Props) {
	//
	const act = useAction(api.reactor.act);
	const [mode, setMode] = useState<Mode>('say');
	const [message, setMessage] = useState('hello from PRO');
	const [prompt, setPrompt] = useState('Summarize the current PRO directory state in one paragraph.');
	const [intelligence, setIntelligence] = useState<string>(trustedIntelligences[0].key);
	const [language, setLanguage] = useState('python');
	const [code, setCode] = useState(defaultExecuteCode);
	const [name, setName] = useState('notes.txt');
	const [createKind, setCreateKind] = useState<'file' | 'folder'>('file');
	const [content, setContent] = useState('hello from PRO\n');
	const [isPending, setIsPending] = useState(false);
	const [error, setError] = useState('');

	const run = async () => {
		//
		setIsPending(true);
		setError('');
		try {
			if (mode === 'say') {
				await act({ directory, skillKey: 'say', args: { message } });
			}
			if (mode === 'think') {
				await act({
					directory,
					skillKey: 'think',
					intelligenceKey: intelligence,
					args: { prompt },
				});
			}
			if (mode === 'execute') {
				await act({
					directory,
					skillKey: 'execute',
					args: { language, code, timeoutSeconds: 60 },
				});
			}
			if (mode === 'create') {
				await act({ directory, skillKey: 'create', args: { kind: createKind, name, content } });
			}
			if (mode === 'createTask') {
				await act({ directory, skillKey: 'createTask', args: { name, body: content, inbox: true } });
			}
			if (mode === 'interrupt') {
				await act({ directory, skillKey: 'interrupt', args: {} });
			}
			onDone(`${mode} complete.`);
		} catch (err) {
			const messageText = err instanceof Error ? err.message : 'Action failed.';
			setError(messageText);
			onDone(messageText);
		} finally {
			setIsPending(false);
		}
	};

	return (
		<Section title="Action Composer" icon={<Send className="size-3.5" />}>
			<div className="mb-3 grid grid-cols-4 gap-1 lg:grid-cols-8">
				{modes.map(({ key, Icon }) => (
					<Button
						key={key}
						type="button"
						size="sm"
						variant={mode === key ? 'default' : 'outline'}
						className="rounded px-2"
						title={key}
						aria-label={key}
						onClick={() => setMode(key)}
					>
						<Icon className="size-4" />
					</Button>
				))}
			</div>
			{mode === 'say' && (
				<Textarea
					className="min-h-20 rounded text-sm"
					value={message}
					onChange={(event) => setMessage(event.target.value)}
				/>
			)}
			{mode === 'think' && (
				<div className="grid gap-2">
					<select
						className="h-9 rounded border border-input bg-background px-2 text-sm"
						value={intelligence}
						onChange={(event) => setIntelligence(event.target.value)}
					>
						{trustedIntelligences.map((entry) => (
							<option key={entry.key} value={entry.key}>
								{providerNames[entry.provider]} - {entry.label}
							</option>
						))}
					</select>
					<Textarea
						className="min-h-24 rounded text-sm"
						value={prompt}
						onChange={(event) => setPrompt(event.target.value)}
					/>
				</div>
			)}
			{mode === 'execute' && (
				<div className="grid gap-2">
					<select
						className="h-9 rounded border border-input bg-background px-2 text-sm"
						value={language}
						onChange={(event) => setLanguage(event.target.value)}
					>
						<option value="python">python</option>
						<option value="javascript">javascript</option>
					</select>
					<Textarea
						className="min-h-48 rounded font-mono text-xs"
						value={code}
						onChange={(event) => setCode(event.target.value)}
					/>
				</div>
			)}
			{(mode === 'create' || mode === 'createTask') && (
				<div className="grid gap-2">
					{mode === 'create' && (
						<select
							className="h-9 rounded border border-input bg-background px-2 text-sm"
							value={createKind}
							onChange={(event) => setCreateKind(event.target.value === 'folder' ? 'folder' : 'file')}
						>
							<option value="file">file</option>
							<option value="folder">folder</option>
						</select>
					)}
					<Input className="rounded" value={name} onChange={(event) => setName(event.target.value)} />
					{((mode === 'create' && createKind === 'file') || mode === 'createTask') && (
						<Textarea
							className="min-h-24 rounded font-mono text-xs"
							value={content}
							onChange={(event) => setContent(event.target.value)}
						/>
					)}
				</div>
			)}
			<div className="mt-3 flex items-center justify-between gap-2">
				<div className="truncate text-xs text-muted-foreground">directory {shortId(directory)}</div>
				<Button type="button" className="rounded" disabled={isPending} onClick={run}>
					{isPending ? <RefreshCcw className="size-4 animate-spin" /> : <Send className="size-4" />}
					Run
				</Button>
			</div>
			{error && (
				<div className="mt-2 rounded border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-700 dark:text-red-300">
					{error}
				</div>
			)}
		</Section>
	);
}
