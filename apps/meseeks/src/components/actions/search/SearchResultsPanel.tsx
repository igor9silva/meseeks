import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { useState } from 'react';

import { TimeAgo } from '~/components/TimeAgo';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@reactor/ui/collapsible';
import { Message, MessageContent } from '~/components/ui/message';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@reactor/ui/tooltip';
import { cn } from '@reactor/ui/lib/utils';
import { buildSummaryText } from './searchResultUtils';

export type SearchDisplayResult = {
	id: string;
	title: string;
	url?: string;
	description?: string;
	displayUrl?: {
		domain: string;
		rest?: string;
	};
	publishedAt?: Date;
	publishedLabel?: string;
	score?: string;
};

export function SearchResultsPanel({
	query,
	answer,
	results,
	isAuthorCurrentUser,
	className,
}: {
	query?: string;
	answer?: string;
	results: SearchDisplayResult[];
	isAuthorCurrentUser: boolean;
	className?: string;
}) {
	//
	const [isOpen, setIsOpen] = useState(false);

	return (
		<Message
			isAuthorCurrentUser={isAuthorCurrentUser}
			className={cn('w-full', className)}
			style={{ maxWidth: '90%' }}
		>
			<Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full max-w-full">
				<CollapsibleTrigger className="flex max-w-full items-center gap-1 text-left">
					<MessageContent
						className="truncate text-left text-sm text-muted-foreground"
						text={buildSummaryText({ query, resultCount: results.length })}
					/>
					{isOpen ? (
						<ChevronUp className="size-3.5 flex-shrink-0 text-muted-foreground" />
					) : (
						<ChevronDown className="size-3.5 flex-shrink-0 text-muted-foreground" />
					)}
				</CollapsibleTrigger>

				<CollapsibleContent className="pt-1.5">
					<div className="overflow-hidden rounded-xl border bg-background/80 shadow-sm">
						{answer && <SearchAnswer answer={answer} />}
						{results.length > 0 ? (
							<div className="max-h-96 overflow-y-auto overscroll-contain scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border">
								<div className="divide-y">
									{results.map((result) => (
										<SearchResultRow key={result.id} result={result} />
									))}
								</div>
							</div>
						) : (
							<div className="px-3 py-2 text-sm text-muted-foreground">
								No results came back for this search.
							</div>
						)}
					</div>
				</CollapsibleContent>
			</Collapsible>
		</Message>
	);
}

function SearchAnswer({ answer }: { answer: string }) {
	//
	return (
		<div className="border-b bg-muted/30 px-3 py-2">
			<p className="text-xs font-medium text-muted-foreground">answer</p>
			<p className="line-clamp-2 text-sm leading-snug">{answer}</p>
		</div>
	);
}

function SearchResultRow({ result }: { result: SearchDisplayResult }) {
	//
	const content = (
		<div className="px-3 py-2 transition-colors hover:bg-muted/30">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0 flex-1 text-xs leading-none">
					{result.displayUrl && (
						<div className="flex items-center gap-1">
							<div className="truncate">
								<span className="font-semibold text-foreground">{result.displayUrl.domain}</span>
								{result.displayUrl.rest && (
									<span className="text-muted-foreground">{result.displayUrl.rest}</span>
								)}
							</div>
							{result.url && <ExternalLink className="size-3 flex-shrink-0 text-muted-foreground" />}
						</div>
					)}
				</div>

				<div className="flex flex-shrink-0 items-center gap-2 text-xs leading-none text-muted-foreground">
					{result.publishedAt && <SearchTimestamp date={result.publishedAt} />}
					{!result.publishedAt && result.publishedLabel && (
						<span className="flex-shrink-0 text-muted-foreground">{result.publishedLabel}</span>
					)}
					{result.score && <SearchScore score={result.score} />}
				</div>
			</div>

			<p className="mt-1 line-clamp-1 text-sm font-normal leading-snug text-foreground/90">{result.title}</p>
			{result.description && (
				<p
					title={result.description}
					className="mt-0.5 line-clamp-2 whitespace-pre-line text-xs leading-snug text-muted-foreground"
				>
					{result.description}
				</p>
			)}
		</div>
	);

	if (!result.url) return content;

	return (
		<a href={result.url} rel="noreferrer" className="block">
			{content}
		</a>
	);
}

function SearchScore({ score }: { score: string }) {
	//
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<span className="cursor-help text-muted-foreground/80 underline decoration-muted-foreground/30 underline-offset-2">
						{score}
					</span>
				</TooltipTrigger>
				<TooltipContent className="text-xs">
					How strongly this result matches the query. Higher is better.
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

function SearchTimestamp({ date }: { date: Date }) {
	//
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<span className="flex-shrink-0 cursor-help text-muted-foreground underline decoration-muted-foreground/30 underline-offset-2">
						<TimeAgo date={date} />
					</span>
				</TooltipTrigger>
				<TooltipContent className="text-xs">
					<span>Published at:</span>
					<div className="font-mono">{date.toISOString()}</div>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
