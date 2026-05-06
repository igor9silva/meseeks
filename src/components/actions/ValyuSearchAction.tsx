import { z } from 'zod/v3';

import { ActionComponentProps } from '~/components/actions';
import { GenericAction } from '~/components/actions/GenericAction';
import {
	formatScore,
	formatQueryLabel,
	getActionQuery,
	getDisplayUrl,
	normalizePublishedDate,
	normalizeText,
	SearchDisplayResult,
	SearchResultsPanel,
} from '~/components/actions/search/SearchResultsPanel';
import { FailedMessage, SimpleMessage } from '~/components/ui/message';

const ValyuResultSchema = z
	.object({
		id: z.string().nullable().optional(),
		title: z.string().nullable().optional(),
		url: z.string().nullable().optional(),
		content: z.unknown().nullable().optional(),
		source: z.string().nullable().optional(),
		price: z.number().nullable().optional(),
		length: z.number().nullable().optional(),
		image_url: z.unknown().nullable().optional(),
		data_type: z.string().nullable().optional(),
		source_type: z.string().nullable().optional(),
		published_date: z.string().nullable().optional(),
		publication_date: z.string().nullable().optional(),
		relevance_score: z.number().nullable().optional(),
		metadata: z.record(z.unknown()).nullable().optional(),
		description: z.string().nullable().optional(),
		snippet: z.string().nullable().optional(),
	})
	.passthrough();

const ValyuSearchResponseSchema = z
	.object({
		success: z.boolean().optional(),
		error: z.string().nullable().optional(),
		tx_id: z.string().nullable().optional(),
		query: z.string().nullable().optional(),
		answer: z.string().nullable().optional(),
		results: z.array(ValyuResultSchema).optional(),
		total_deduction_dollars: z.number().nullable().optional(),
		total_characters: z.number().nullable().optional(),
		results_by_source: z.record(z.number()).nullable().optional(),
	})
	.passthrough();

type ValyuSearchResponse = z.infer<typeof ValyuSearchResponseSchema>;
type ValyuResult = z.infer<typeof ValyuResultSchema>;

export function ValyuSearchAction(props: ActionComponentProps) {
	//
	const { action, isAuthorCurrentUser } = props;
	const query = getActionQuery(action);

	switch (action.status) {
		//
		case 'enqueued':
		case 'skipped':
			return null;

		case 'blocked':
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
	const response = parseValyuSearchResponse(action.result?.text);

	if (!response) {
		console.warn('Invalid (or no) result found for succeeded valyu search action', action._id);
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
	const results = normalizeValyuSearchResults(response);

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

function parseValyuSearchResponse(resultText: string | undefined) {
	//
	if (!resultText) return null;

	try {
		const parsed = JSON.parse(resultText);
		const payload = Array.isArray(parsed) ? { results: parsed } : parsed;
		const response = ValyuSearchResponseSchema.safeParse(payload);

		if (!response.success) return null;
		return response.data;
	} catch {
		return null;
	}
}

function normalizeValyuSearchResults(response: ValyuSearchResponse) {
	//
	const rawResults = response.results ?? [];

	return rawResults.map((result, index): SearchDisplayResult => {
		const url = normalizeText(result.url);
		const displayUrl = getDisplayUrl(url, result.source);
		const title = normalizeText(result.title) ?? displayUrl?.domain ?? url ?? `Result ${index + 1}`;
		const { publishedAt, publishedLabel } = normalizePublishedDate(
			result.published_date ?? result.publication_date,
		);

		return {
			id: normalizeText(result.id) ?? url ?? `${title}-${index}`,
			title,
			url,
			description: getValyuDescription(result),
			displayUrl,
			publishedAt,
			publishedLabel,
			score: formatScore(result.relevance_score),
		};
	});
}

function getValyuDescription(result: ValyuResult) {
	//
	const textDescription =
		normalizeText(result.description) ?? normalizeText(result.snippet) ?? normalizeUnknownText(result.content);

	if (textDescription) return textDescription;

	const metadataDescription = getMetadataDescription(result.metadata);
	const structuredContentDescription = getStructuredContentDescription(result.content, result.data_type);

	return [metadataDescription, structuredContentDescription].filter(Boolean).join(' ').trim() || undefined;
}

function normalizeUnknownText(value: unknown) {
	//
	return typeof value === 'string' ? normalizeText(value) : undefined;
}

function getMetadataDescription(metadata: Record<string, unknown> | null | undefined) {
	//
	if (!metadata) return undefined;

	const name = getRecordString(metadata, 'name');
	const ticker = getRecordString(metadata, 'ticker');
	const interval = getRecordString(metadata, 'interval');
	const start = getRecordString(metadata, 'start');
	const end = getRecordString(metadata, 'end');

	const parts = [
		name && ticker ? `${name} (${ticker})` : name ?? ticker,
		interval,
		start && end ? `${start} to ${end}` : start ?? end,
	].filter(Boolean);

	return parts.length > 0 ? parts.join(' | ') : undefined;
}

function getStructuredContentDescription(content: unknown, dataType: string | null | undefined) {
	//
	if (!Array.isArray(content) || content.length === 0)
		return dataType === 'structured' ? 'Structured dataset.' : undefined;

	const rows = content.filter(isRecord);
	if (rows.length === 0) return dataType === 'structured' ? 'Structured dataset.' : undefined;

	const peakRow = getPeakHighRow(rows);
	const latestRow = getLatestCloseRow(rows);
	const summaries = [`Structured dataset with ${rows.length} rows.`];

	if (peakRow) {
		summaries.push(`Peak high ${formatNumericValue(peakRow.high)} on ${peakRow.datetime}.`);
	}

	if (latestRow) {
		summaries.push(`Latest close ${formatNumericValue(latestRow.close)} on ${latestRow.datetime}.`);
	}

	return summaries.join(' ');
}

function isRecord(value: unknown): value is Record<string, unknown> {
	//
	return typeof value === 'object' && value !== null;
}

function getRecordString(record: Record<string, unknown>, key: string) {
	//
	const value = record[key];
	return typeof value === 'string' ? normalizeText(value) : undefined;
}

function getRecordNumber(record: Record<string, unknown>, key: string) {
	//
	const value = record[key];
	return typeof value === 'number' ? value : undefined;
}

function getPeakHighRow(rows: Record<string, unknown>[]) {
	//
	return rows.reduce<{
		datetime: string;
		high: number;
	} | null>((peakRow, row) => {
		const datetime = getRecordString(row, 'datetime');
		const high = getRecordNumber(row, 'high');

		if (!datetime || typeof high !== 'number') return peakRow;
		if (!peakRow || high > peakRow.high) return { datetime, high };
		return peakRow;
	}, null);
}

function getLatestCloseRow(rows: Record<string, unknown>[]) {
	//
	return rows.reduce<{
		datetime: string;
		close: number;
	} | null>((latestRow, row) => {
		const datetime = getRecordString(row, 'datetime');
		const close = getRecordNumber(row, 'close');

		if (!datetime || typeof close !== 'number') return latestRow;
		if (!latestRow || datetime > latestRow.datetime) return { datetime, close };
		return latestRow;
	}, null);
}

function formatNumericValue(value: number) {
	//
	return value.toLocaleString(undefined, {
		maximumFractionDigits: 2,
	});
}
