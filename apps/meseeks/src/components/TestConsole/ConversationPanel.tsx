import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import type { Doc, Id } from 'convex/_generated/dataModel';
import type { FormEvent } from 'react';
import { Suspense, useEffect, useRef, useState } from 'react';
import { api } from 'convex/_generated/api';
import { INTELLIGENCES, intelligenceKeys } from 'schemas/intelligenceSchema';
import { Bot, Send, UserRound } from 'lucide-react';
import { Button } from '@reactor/ui/button';
import { Card, CardContent } from '@reactor/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@reactor/ui/tabs';
import { Textarea } from '@reactor/ui/textarea';
import { useAct } from '~/hooks/useAct';
import { useCurrentUser } from '~/hooks/useCurrentUser';
import { CreateDirectoryPanel, CreateTextFilePanel, UploadFilesPanel } from './DirectoryWorkbench';
import { MoveFilePanel, TagFilePanel } from './FileWorkbench';
import { ReactorPanel } from './ReactorPanel';
import { TriggerActionPanel } from './TriggerPanel';
import { contentFromPatch } from './revisions';
import { Result, formatError } from './shared';

export function ConversationPanel({
	actions,
	currentDirectory,
	currentPath,
	onSelectAction,
	root,
	scopePath,
	selectedAction,
	selectedFile,
	selectedPath,
}: {
	actions: Array<Doc<'actions'>>;
	currentDirectory: Id<'files'>;
	currentPath: string;
	onSelectAction: (action: string) => void;
	root: Id<'files'>;
	scopePath: string;
	selectedAction?: Doc<'actions'>;
	selectedFile?: Doc<'files'>;
	selectedPath?: string;
}) {
	//
	const scrollRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const element = scrollRef.current;
		if (!element) return;

		element.scrollTop = element.scrollHeight;
	}, [actions.length, root]);

	return (
		<Card className="flex h-full min-h-0 min-w-0 flex-col">
			<CardContent className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
				<div
					ref={scrollRef}
					className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden p-3"
					data-testid="test-console-conversation"
				>
					{actions.length === 0 ? (
						<div className="flex min-h-60 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
							No actions yet.
						</div>
					) : (
						actions.map((action) => (
							<ActionMessage
								key={action._id}
								action={action}
								isSelected={action._id === selectedAction?._id}
								onSelectAction={onSelectAction}
							/>
						))
					)}
				</div>
				<ConversationComposer
					currentDirectory={currentDirectory}
					currentPath={currentPath}
					root={root}
					scopePath={scopePath}
					selectedFile={selectedFile}
					selectedPath={selectedPath}
				/>
			</CardContent>
		</Card>
	);
}

function ActionMessage({
	action,
	isSelected,
	onSelectAction,
}: {
	action: Doc<'actions'>;
	isSelected: boolean;
	onSelectAction: (action: string) => void;
}) {
	//
	const currentUser = useCurrentUser();
	const isHuman = action.author === currentUser._id;
	const alignment = isHuman ? 'items-end' : 'items-start';
	const bubble = isHuman ? 'bg-primary text-primary-foreground' : 'bg-muted';
	const selected = isSelected ? 'ring-2 ring-ring' : '';

	return (
		<div className={`flex min-w-0 max-w-full flex-col ${alignment}`}>
			<button
				type="button"
				className={`w-fit min-w-0 max-w-full rounded-lg px-3 py-2 text-left text-sm shadow-sm whitespace-normal break-words ${bubble} ${selected}`}
				onClick={() => onSelectAction(action._id)}
			>
				<div className="mb-1 flex min-w-0 max-w-full flex-wrap items-center gap-x-3 gap-y-1 text-xs opacity-80">
					<div className="flex min-w-0 items-center gap-2">
						{isHuman ? <UserRound className="size-3 shrink-0" /> : <Bot className="size-3 shrink-0" />}
						<span className="font-mono">#{action.index}</span>
					</div>
					<div className="ml-auto flex min-w-0 max-w-full flex-wrap items-center gap-2 font-mono">
						<span className="min-w-0 break-all">{action.skill}</span>
						<span className="min-w-0 break-all">{action.status}</span>
					</div>
				</div>
				<Suspense
					fallback={
						<div className="min-w-0 max-w-full whitespace-pre-wrap break-words">
							{messageText(action, undefined)}
						</div>
					}
				>
					<MessageBody action={action} />
				</Suspense>
				{action.warnings?.length ? (
					<div className="mt-2 text-xs opacity-80">{action.warnings.join('; ')}</div>
				) : null}
			</button>
		</div>
	);
}

function MessageBody({ action }: { action: Doc<'actions'> }) {
	//
	const revisionsQuery = convexQuery(api.files.listRevisionsByAction, { action: action._id });
	const { data: revisions } = useSuspenseQuery(revisionsQuery);
	const outputRevision = action.output ? revisions.find((revision) => revision.file === action.output) : undefined;
	const outputContent = contentFromPatch(outputRevision?.patch);

	return (
		<div className="min-w-0 max-w-full whitespace-pre-wrap break-words">{messageText(action, outputContent)}</div>
	);
}

function ConversationComposer({
	currentDirectory,
	currentPath,
	root,
	scopePath,
	selectedFile,
	selectedPath,
}: {
	currentDirectory: Id<'files'>;
	currentPath: string;
	root: Id<'files'>;
	scopePath: string;
	selectedFile?: Doc<'files'>;
	selectedPath?: string;
}) {
	//
	const { act, isActing } = useAct();
	const [message, setMessage] = useState('');
	const [intelligence, setIntelligence] = useState('');
	const [result, setResult] = useState('');

	const handleSay = async (event: FormEvent) => {
		//
		event.preventDefault();
		await submit('say');
	};

	const handleThink = async () => {
		//
		await submit('think');
	};

	const submit = async (skill: 'say' | 'think') => {
		//
		const content = message.trim();
		if (!content) return;

		setResult('');

		try {
			const parsedIntelligence = intelligenceKeys.safeParse(intelligence);
			await act([
				{
					root,
					skill,
					intelligence: parsedIntelligence.success ? parsedIntelligence.data : undefined,
					input: skill === 'think' ? { prompt: content } : { message: content },
				},
			]);
			setMessage('');
		} catch (error) {
			setResult(formatError(error));
		}
	};

	return (
		<div className="min-w-0 shrink-0 border-t p-3">
			<Tabs defaultValue="chat" className="min-w-0">
				<TabsList className="mb-3 w-max max-w-full overflow-x-auto">
					<TabsTrigger value="chat">Composer</TabsTrigger>
					<TabsTrigger value="upload">Upload</TabsTrigger>
					<TabsTrigger value="file-create">File</TabsTrigger>
					<TabsTrigger value="directory-create">Directory</TabsTrigger>
					<TabsTrigger value="triggers">Trigger</TabsTrigger>
					{selectedFile ? <TabsTrigger value="move">Move</TabsTrigger> : null}
					{selectedFile ? <TabsTrigger value="tag">Tag</TabsTrigger> : null}
					<TabsTrigger value="advanced">Advanced</TabsTrigger>
				</TabsList>

				<TabsContent value="chat" className="mt-0">
					<form className="grid min-w-0 gap-2" onSubmit={handleSay}>
						<Textarea
							className="min-h-16 resize-none text-sm"
							data-testid="test-console-chat-input"
							placeholder="Say something, or ask intelligence to think..."
							value={message}
							onChange={(event) => setMessage(event.target.value)}
						/>
						<div className="flex flex-col gap-2 md:flex-row md:items-center">
							<select
								className="h-9 rounded-md border bg-background px-3 text-sm"
								value={intelligence}
								onChange={(event) => setIntelligence(event.target.value)}
							>
								<option value="">default intelligence</option>
								{Object.values(INTELLIGENCES).map((item) => (
									<option key={item.key} value={item.key}>
										{item.name}
									</option>
								))}
							</select>
							<div className="flex gap-2 md:ml-auto">
								<Button
									type="submit"
									disabled={isActing || !message.trim()}
									data-testid="test-console-say"
								>
									<Send className="mr-2 size-4" />
									Say
								</Button>
								<Button
									type="button"
									variant="outline"
									disabled={isActing || !message.trim()}
									data-testid="test-console-think"
									onClick={handleThink}
								>
									Think
								</Button>
							</div>
						</div>
						<Result value={result} />
					</form>
				</TabsContent>

				<TabsContent value="upload" className="mt-0">
					<UploadFilesPanel
						currentDirectory={root}
						currentPath={scopePath}
						defaultDirectoryName="uploads"
						root={root}
					/>
				</TabsContent>

				<TabsContent value="file-create" className="mt-0">
					<CreateTextFilePanel currentDirectory={currentDirectory} currentPath={currentPath} root={root} />
				</TabsContent>

				<TabsContent value="directory-create" className="mt-0">
					<CreateDirectoryPanel currentDirectory={currentDirectory} currentPath={currentPath} root={root} />
				</TabsContent>

				<TabsContent value="triggers" className="mt-0">
					<TriggerActionPanel root={root} />
				</TabsContent>

				{selectedFile ? (
					<TabsContent value="move" className="mt-0">
						<MoveFilePanel file={selectedFile} path={selectedPath ?? currentPath} root={root} />
					</TabsContent>
				) : null}

				{selectedFile ? (
					<TabsContent value="tag" className="mt-0">
						<TagFilePanel file={selectedFile} root={root} />
					</TabsContent>
				) : null}

				<TabsContent value="advanced" className="mt-0">
					<ReactorPanel currentPath={currentPath} root={root} selectedFile={selectedFile} />
				</TabsContent>
			</Tabs>
		</div>
	);
}

function messageText(action: Doc<'actions'>, outputContent: string | undefined) {
	//
	if (outputContent) return outputContent;
	if (action.skill === 'say' && typeof action.input.message === 'string') return action.input.message;
	if (action.skill === 'think' && typeof action.input.prompt === 'string') return action.input.prompt;

	return JSON.stringify(action.input, undefined, 2);
}
