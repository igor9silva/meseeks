import type { Doc } from 'convex/_generated/dataModel';
import { useState } from 'react';
import { Badge } from '~/components/ui/badge';
import { DetailsHeader } from './DetailsHeader';
import { KeyValueBlock } from './KeyValueBlock';

export function HttpDetailsSection({
	actionDetails,
}: {
	actionDetails: Extract<Doc<'action_details'>, { skillKind: 'hard' }>;
}) {
	//
	const http = actionDetails.http;
	const [searchParamsOpen, setSearchParamsOpen] = useState(false);
	const [responseBodyOpen, setResponseBodyOpen] = useState(false);
	const [responseHeadersOpen, setResponseHeadersOpen] = useState(false);
	const requestUrl = http.url ?? '';
	const displayUrl = requestUrl ? requestUrl.split('?')[0] : 'URL unavailable';
	const searchParams = searchParamsFrom(requestUrl);

	return (
		<div className="space-y-3">
			<div>
				<div className="bg-muted border rounded p-3 font-mono text-sm flex justify-between items-center">
					<div className="flex items-center gap-1 min-w-0 flex-1">
						<Badge variant="outline" className="text-xs flex-shrink-0">
							{http.method}
						</Badge>
						<span className="text-muted-foreground truncate">{displayUrl}</span>
					</div>
					{http.statusCode && (
						<Badge
							variant={http.statusCode >= 400 ? 'destructive' : 'default'}
							className="text-xs ml-2 flex-shrink-0"
						>
							{http.statusCode}
						</Badge>
					)}
				</div>
			</div>

			{Object.keys(searchParams).length > 0 && (
				<div>
					<DetailsHeader
						isOpen={searchParamsOpen}
						onClick={() => setSearchParamsOpen(!searchParamsOpen)}
						title="Search Parameters"
						summary={`(${Object.keys(searchParams).length} parameters)`}
					/>
					{searchParamsOpen && <KeyValueBlock entries={Object.entries(searchParams)} />}
				</div>
			)}

			{http.responseBody && (
				<div>
					<DetailsHeader
						isOpen={responseBodyOpen}
						onClick={() => setResponseBodyOpen(!responseBodyOpen)}
						title="Response Body"
						summary={http.responseBodySize ? `(${http.responseBodySize} bytes)` : ''}
					/>
					{responseBodyOpen && (
						<textarea
							value={http.responseBody}
							readOnly
							className="w-full min-h-32 max-h-[48rem] p-3 text-xs bg-muted border rounded-lg resize-y whitespace-pre-wrap font-mono"
							style={{ fontFamily: 'ui-monospace, monospace' }}
						/>
					)}
				</div>
			)}

			{http.responseHeaders && Object.keys(http.responseHeaders).length > 0 && (
				<div>
					<DetailsHeader
						isOpen={responseHeadersOpen}
						onClick={() => setResponseHeadersOpen(!responseHeadersOpen)}
						title="Response Headers"
						summary={`(${Object.keys(http.responseHeaders).length} headers)`}
					/>
					{responseHeadersOpen && <KeyValueBlock entries={Object.entries(http.responseHeaders)} />}
				</div>
			)}
		</div>
	);
}

function searchParamsFrom(requestUrl: string) {
	//
	try {
		const url = new URL(requestUrl);
		return Object.fromEntries(url.searchParams.entries());
	} catch {
		return {};
	}
}
