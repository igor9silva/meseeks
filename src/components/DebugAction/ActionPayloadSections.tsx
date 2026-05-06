import type { Doc } from 'convex/_generated/dataModel';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { z } from 'zod/v3';
import type { newActionSchema } from 'schemas/actionSchema';

export function ArgumentsSection({ args }: { args: Record<string, unknown> }) {
	//
	if (!args || Object.keys(args).length === 0) return null;

	const [isOpen, setIsOpen] = useState(false);

	return (
		<div>
			<SectionHeader
				isOpen={isOpen}
				onClick={() => setIsOpen(!isOpen)}
				title="Arguments"
				summary={`(${Object.keys(args).length})`}
			/>
			{isOpen && <KeyValueBlock entries={Object.entries(args)} />}
		</div>
	);
}

export function ResultSection({ result }: { result: Doc<'actions'>['result'] }) {
	//
	if (!result) return null;

	const [isOpen, setIsOpen] = useState(false);
	const hasText = Boolean(result.text);
	const hasReactions = Boolean(result.reactions && result.reactions.length > 0);

	if (!hasText && !hasReactions) {
		const jsonString = JSON.stringify(result, null, 2);
		return (
			<div>
				<SectionHeader
					isOpen={isOpen}
					onClick={() => setIsOpen(!isOpen)}
					title="Result"
					summary={`(${jsonString.length} characters)`}
				/>
				{isOpen && (
					<textarea
						value={jsonString}
						readOnly
						className="w-full min-h-32 max-h-[48rem] p-3 text-xs bg-muted border rounded-lg resize-y whitespace-pre-wrap font-mono"
						style={{ fontFamily: 'ui-monospace, monospace' }}
					/>
				)}
			</div>
		);
	}

	const summary = resultSummary({ result, hasText, hasReactions });

	return (
		<div>
			<SectionHeader isOpen={isOpen} onClick={() => setIsOpen(!isOpen)} title="Result" summary={summary} />
			{isOpen && (
				<div className="space-y-3">
					{hasText && (
						<textarea
							value={result.text}
							readOnly
							className="w-full min-h-32 max-h-[48rem] p-3 text-sm bg-muted border rounded-lg resize-y whitespace-pre-wrap"
							style={{ fontFamily: 'inherit' }}
						/>
					)}

					{hasReactions && (
						<div className="space-y-2">
							{result.reactions?.map((reaction, index) => (
								<ReactionItem key={index} reaction={reaction} index={index} />
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}

function ReactionItem({ reaction, index }: { reaction: z.infer<typeof newActionSchema>; index: number }) {
	//
	const [isOpen, setIsOpen] = useState(false);
	const argCount = reaction.args ? Object.keys(reaction.args).length : 0;

	return (
		<div className="ml-4">
			<SectionHeader
				isOpen={isOpen}
				onClick={() => setIsOpen(!isOpen)}
				title={reaction.skillKey}
				summary={`(${argumentCountText(argCount)})`}
			/>
			{isOpen &&
				(argCount > 0 ? (
					<KeyValueBlock entries={Object.entries(reaction.args)} />
				) : (
					<div className="bg-muted border rounded-lg p-3 text-sm text-muted-foreground italic">
						No arguments
					</div>
				))}
		</div>
	);
}

function SectionHeader({
	isOpen,
	onClick,
	title,
	summary,
}: {
	isOpen: boolean;
	onClick: () => void;
	title: string;
	summary: string;
}) {
	//
	return (
		<div
			className="flex items-baseline gap-2 text-sm font-medium mb-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
			onClick={onClick}
		>
			{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
			{title}
			<span className="text-muted-foreground font-normal text-xs">{summary}</span>
		</div>
	);
}

function KeyValueBlock({ entries }: { entries: Array<[string, unknown]> }) {
	//
	return (
		<div className="bg-muted border rounded-lg p-3 text-sm space-y-1 max-h-48 overflow-auto resize-y">
			{entries.map(([key, value]) => (
				<div key={key} className="flex gap-2">
					<span className="text-blue-600 dark:text-blue-400 font-medium flex-shrink-0">{key}:</span>
					<span className="whitespace-pre-wrap break-words">
						{typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
					</span>
				</div>
			))}
		</div>
	);
}

function resultSummary({
	result,
	hasText,
	hasReactions,
}: {
	result: Doc<'actions'>['result'];
	hasText: boolean;
	hasReactions: boolean;
}) {
	//
	if (!result) return '';
	if (hasText && hasReactions) return `(${result.text?.length} characters, ${result.reactions?.length} reactions)`;
	if (hasText) return `(${result.text?.length} characters)`;
	if (hasReactions) return `(${result.reactions?.length} reactions)`;

	return '';
}

function argumentCountText(count: number) {
	//
	return count === 1 ? `${count} argument` : `${count} arguments`;
}
