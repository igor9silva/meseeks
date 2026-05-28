import { z } from 'zod/v3';

import { ActionComponentProps } from '~/components/actions';
import { GenericAction } from '~/components/actions/GenericAction';
import { SearchResultsPanel, type SearchDisplayResult } from '~/components/actions/search/SearchResultsPanel';
import {
	formatScore,
	formatQueryLabel,
	getActionQuery,
	getDisplayUrl,
	normalizePublishedDate,
	normalizeText,
} from '~/components/actions/search/searchResultUtils';
import { FailedMessage, SimpleMessage } from '~/components/ui/message';

const SearchWebResultSchema = z
	.object({
		title: z.string().nullable().optional(),
		url: z.string().nullable().optional(),
		description: z.string().nullable().optional(),
		snippet: z.string().nullable().optional(),
		content: z.string().nullable().optional(),
		raw_content: z.unknown().nullable().optional(),
		published_date: z.string().nullable().optional(),
		score: z.number().nullable().optional(),
		source: z.string().nullable().optional(),
	})
	.passthrough();

const SearchWebResponseSchema = z
	.object({
		query: z.string().nullable().optional(),
		answer: z.string().nullable().optional(),
		results: z.array(SearchWebResultSchema).optional(),
		sources: z.array(SearchWebResultSchema).optional(),
	})
	.passthrough();

type SearchWebResponse = z.infer<typeof SearchWebResponseSchema>;

export function SearchWebAction(props: ActionComponentProps) {
	//
	const { action, isAuthorCurrentUser } = props;
	const query = getActionQuery(action);

	switch (action.status) {
		//
		case 'enqueued':
		case 'skipped':
			return null;

		case 'pending authorization':
			return <GenericAction {...props} />;

		case 'failed':
			return (
				<FailedMessage
					text={query ? `Failed to search ${formatQueryLabel(query)}` : 'Failed to search'}
					error={action.result?.text ?? ''}
					isAuthorCurrentUser={isAuthorCurrentUser}
				/>
			);

		case 'running':
			return (
				<SimpleMessage
					running
					text={query ? `Searching ${formatQueryLabel(query)}` : 'Searching'}
					isAuthorCurrentUser={isAuthorCurrentUser}
				/>
			);

		case 'succeeded':
			return <Success {...props} />;
	}
}

function Success(props: ActionComponentProps) {
	//
	const { action, isAuthorCurrentUser, className } = props;
	const response = parseSearchWebResponse(action.result?.text);

	if (!response) {
		console.warn('Invalid (or no) result found for succeeded search action', action._id);
		return (
			<FailedMessage
				text={
					getActionQuery(action)
						? `Failed to search ${formatQueryLabel(getActionQuery(action) ?? '')}`
						: 'Failed to search'
				}
				error={action.result?.text ?? ''}
				isAuthorCurrentUser={isAuthorCurrentUser}
			/>
		);
	}

	const query = response.query ?? getActionQuery(action);
	const answer = normalizeText(response.answer);
	const results = normalizeSearchWebResults(response);

	return (
		<SearchResultsPanel
			query={query}
			answer={answer}
			results={results}
			isAuthorCurrentUser={isAuthorCurrentUser}
			className={className}
		/>
	);
}

function parseSearchWebResponse(resultText: string | undefined) {
	//
	if (!resultText) return null;

	try {
		const parsed = JSON.parse(resultText);
		const payload = Array.isArray(parsed) ? { results: parsed } : parsed;
		const response = SearchWebResponseSchema.safeParse(payload);

		if (!response.success) return null;
		return response.data;
	} catch {
		return null;
	}
}

function normalizeSearchWebResults(response: SearchWebResponse) {
	//
	const rawResults = response.results ?? response.sources ?? [];

	return rawResults.map((result, index): SearchDisplayResult => {
		const url = normalizeText(result.url);
		const displayUrl = getDisplayUrl(url, result.source);
		const description =
			normalizeText(result.description) ??
			normalizeText(result.snippet) ??
			normalizeText(result.content) ??
			normalizeUnknownText(result.raw_content);
		const title = normalizeText(result.title) ?? displayUrl?.domain ?? url ?? `Result ${index + 1}`;
		const { publishedAt, publishedLabel } = normalizePublishedDate(result.published_date);

		return {
			id: url ?? `${title}-${index}`,
			title,
			url,
			description,
			displayUrl,
			publishedAt,
			publishedLabel,
			score: formatScore(result.score),
		};
	});
}

function normalizeUnknownText(value: unknown) {
	//
	return typeof value === 'string' ? normalizeText(value) : undefined;
}
