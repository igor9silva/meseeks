import type { Doc } from 'convex/_generated/dataModel';
import { Badge } from '~/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { MessageHistorySection } from './MessageHistorySection';

export function LlmDetailsSection({
	actionDetails,
}: {
	actionDetails: Extract<Doc<'action_details'>, { skillKind: 'soft' }>;
}) {
	//
	const llm = actionDetails.llm;

	return (
		<div className="space-y-3">
			<div className="grid grid-cols-4 gap-4 text-sm">
				<div className="col-span-2">
					<span className="text-muted-foreground">Model</span>
					<div className="font-mono truncate" title={`${llm.model} (${llm.temperature || 'N/A'} 🌡️)`}>
						{llm.model} ({llm.temperature || 'N/A'} 🌡️)
					</div>
				</div>
				<div>
					<span className="text-muted-foreground">Finish Reason</span>
					<div className="font-mono truncate" title={llm.finishReason}>
						{llm.finishReason || 'N/A'}
					</div>
				</div>
				{llm.usage && (
					<div>
						<span className="text-muted-foreground">Tokens</span>
						<Tooltip>
							<TooltipTrigger asChild>
								<div className="font-mono cursor-pointer hover:text-blue-600 dark:hover:text-blue-400">
									{llm.usage.input.total} → {llm.usage.output.total}
								</div>
							</TooltipTrigger>
							<TooltipContent side="bottom" align="center" className="max-w-sm">
								<div className="space-y-1 text-xs">
									<div>Input tokens: {llm.usage.input.total.toLocaleString()}</div>
									<div>Output tokens: {llm.usage.output.total.toLocaleString()}</div>
								</div>
							</TooltipContent>
						</Tooltip>
					</div>
				)}
			</div>

			<MessageHistorySection messages={llm.history} />

			{llm.availableTools && llm.availableTools.length > 0 && (
				<div>
					<div className="text-sm font-medium mb-2">Available Skills</div>
					<div className="flex flex-wrap gap-1">
						{llm.availableTools.map((tool: string) => (
							<Badge key={tool} variant="secondary" className="text-xs font-mono">
								{tool}
							</Badge>
						))}
					</div>
				</div>
			)}

			{llm.systemInstructions && (
				<div>
					<div className="flex items-baseline justify-between text-sm font-medium mb-2">
						<div>System Instructions</div>
						<span className="text-muted-foreground font-normal text-xs">
							{/* TODO: use env var CHAR_PER_TOKEN (currently server only) */}(
							{llm.systemInstructions.length} chars ~{Math.ceil(llm.systemInstructions.length / 3.5)}{' '}
							tokens)
						</span>
					</div>
					<textarea
						value={llm.systemInstructions}
						readOnly
						className="w-full min-h-32 max-h-[48rem] p-3 text-sm bg-muted border rounded resize-y whitespace-pre-wrap"
						style={{ fontFamily: 'inherit' }}
					/>
				</div>
			)}

			{llm.toolCalls && llm.toolCalls.length > 0 && (
				<div>
					<div className="text-sm font-medium mb-2">Tool Calls</div>
					<textarea
						value={JSON.stringify(llm.toolCalls, null, 2)}
						readOnly
						className="w-full min-h-32 max-h-[48rem] p-3 text-xs bg-muted border rounded-lg resize-y whitespace-pre-wrap font-mono"
						style={{ fontFamily: 'ui-monospace, monospace' }}
					/>
				</div>
			)}

			{llm.text && (
				<div>
					<div className="text-sm font-medium mb-2">LLM Response</div>
					<textarea
						value={llm.text}
						readOnly
						className="w-full min-h-32 max-h-[48rem] p-3 text-sm bg-muted border rounded resize-y whitespace-pre-wrap"
						style={{ fontFamily: 'inherit' }}
					/>
				</div>
			)}
		</div>
	);
}
