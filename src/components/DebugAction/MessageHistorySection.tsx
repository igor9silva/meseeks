import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { DetailsHeader } from './DetailsHeader';

export function MessageHistorySection({
	messages, //
}: {
	messages: Array<{ role: string; content: string }>;
}) {
	//
	if (!messages || messages.length === 0) {
		return (
			<div>
				<div className="text-sm font-medium mb-2">History</div>
				<div className="text-muted-foreground text-sm italic">No conversation history</div>
			</div>
		);
	}

	const [isOpen, setIsOpen] = useState(false);

	return (
		<div>
			<DetailsHeader
				isOpen={isOpen}
				onClick={() => setIsOpen(!isOpen)}
				title="History"
				summary={`(${messages.length} messages)`}
			/>

			{isOpen && (
				<div className="space-y-3">
					{messages.map((message, index) => (
						<MessageHistoryItem key={index} message={message} index={index} />
					))}
				</div>
			)}
		</div>
	);
}

function MessageHistoryItem({
	message, //
	index,
}: {
	message: { role: string; content: string };
	index: number;
}) {
	//
	const [isOpen, setIsOpen] = useState(false);

	return (
		<div className="border rounded-3xl p-3 bg-card">
			<div
				className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded-lg p-2 -m-2"
				onClick={() => setIsOpen(!isOpen)}
			>
				{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
				<span className="text-xs font-mono text-muted-foreground">#{index + 1}</span>
				<span className={`text-sm font-medium ${roleColorFor(message.role)}`}>
					{roleIconFor(message.role)} {message.role}
				</span>
				<div className="flex-1" />
				<span className="text-xs text-muted-foreground">
					{/* TODO: use env var CHAR_PER_TOKEN (currently server only) */}
					{message.content.length} chars (~{Math.ceil(message.content.length / 3.5)} tokens)
				</span>
			</div>

			{isOpen && (
				<div className="mt-3 pt-3 border-t">
					<textarea
						value={message.content}
						readOnly
						className="w-full min-h-24 max-h-64 p-3 text-sm bg-muted border rounded resize-y whitespace-pre-wrap"
						style={{ fontFamily: 'inherit' }}
					/>
				</div>
			)}
		</div>
	);
}

function roleColorFor(role: string) {
	//
	switch (role) {
		case 'system':
			return 'text-red-600 dark:text-red-400';
		case 'user':
			return 'text-blue-600 dark:text-blue-400';
		case 'assistant':
			return 'text-green-600 dark:text-green-400';
		case 'tool':
			return 'text-purple-600 dark:text-purple-400';
		case 'function':
			return 'text-orange-600 dark:text-orange-400';
		default:
			return 'text-gray-600 dark:text-gray-400';
	}
}

function roleIconFor(role: string) {
	//
	switch (role) {
		case 'system':
			return '🔧';
		case 'user':
			return '👤';
		case 'assistant':
			return '🤖';
		case 'tool':
			return '🔨';
		case 'function':
			return '⚙️';
		default:
			return '💬';
	}
}
