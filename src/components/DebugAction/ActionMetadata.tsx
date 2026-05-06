import type { Doc } from 'convex/_generated/dataModel';
import type { MouseEvent } from 'react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { copyToClipboard, formatLocalTimestamp } from './utils';

export function LifecycleSection({ action }: { action: Doc<'actions'> }) {
	//
	const events = [
		{ label: 'Created', timestamp: action._creationTime },
		{ label: 'Claimed', timestamp: action.claimedAt },
		{ label: 'Reserved energy', timestamp: action.reservedAt },
		{ label: 'Started', timestamp: action.startedAt },
		{ label: 'Authorization requested', timestamp: action.authorizationRequestedAt },
		{ label: 'Authorized', timestamp: action.approvedAt },
		{ label: 'Interrupted', timestamp: action.interruptedAt },
		{ label: 'Settled', timestamp: action.settledAt },
		{ label: 'Finished', timestamp: action.finishedAt },
	];

	return (
		<div className="space-y-2">
			<div className="text-sm font-medium">Lifecycle</div>
			<div className="grid gap-1 text-xs">
				{events.map((event) => {
					const timestamp = event.timestamp;
					if (!timestamp) return null;
					const localTimestamp = formatLocalTimestamp(timestamp);
					const eventLine = `${event.label}: ${localTimestamp}`;

					return (
						<Tooltip key={event.label}>
							<TooltipTrigger asChild>
								<button
									type="button"
									className="grid w-full grid-cols-[auto_1fr] items-center gap-3 text-left hover:text-foreground"
									onClick={() => {
										copyToClipboard(eventLine);
										toast.success('Copied lifecycle timestamp to clipboard');
									}}
								>
									<span className="text-muted-foreground">{event.label}</span>
									<span className="justify-self-end whitespace-nowrap font-mono">{localTimestamp}</span>
								</button>
							</TooltipTrigger>
							<TooltipContent side="top" className="max-w-sm">
								<div className="space-y-1">
									<div className="font-mono text-xs">{new Date(timestamp).toISOString()}</div>
									<div className="text-xs">{eventLine}</div>
								</div>
							</TooltipContent>
						</Tooltip>
					);
				})}
			</div>
		</div>
	);
}

export function AuthorizationSection({
	action,
	isAuthorCurrentUser,
}: {
	action: Doc<'actions'>;
	isAuthorCurrentUser: boolean;
}) {
	//
	const hasAuthorizationInfo = action.approvedAt || action.approvedBy;

	if (!hasAuthorizationInfo) return null;
	// if (action.status === 'skipped') return null;

	const handleAuthorizedAtClick = (event: MouseEvent) => {
		event.stopPropagation();
		if (!action.approvedAt) return;

		copyToClipboard(new Date(action.approvedAt).toISOString());
		toast.success('Copied authorization timestamp to clipboard');
	};

	const handleAuthorizedByClick = (event: MouseEvent) => {
		event.stopPropagation();
		if (!action.approvedBy || action.approvedBy === 'auto') return;

		copyToClipboard(action.approvedBy);
		toast.success('Copied approver ID to clipboard');
	};

	const isAuthorizedByCurrentUser = action.approvedBy === action.owner;
	const isAutomaticAuthorization = action.approvedBy === 'auto';
	const isClickable = action.approvedBy && !isAutomaticAuthorization;

	return (
		<div className="text-xs text-muted-foreground">
			Authorized{' '}
			{action.approvedBy && (
				<>
					{isAutomaticAuthorization ? (
						<span>automatically</span>
					) : (
						<code
							className={
								isClickable
									? 'hover:text-foreground cursor-pointer underline-offset-2 hover:underline'
									: ''
							}
							onClick={isClickable ? handleAuthorizedByClick : undefined}
						>
							by {isAuthorizedByCurrentUser ? 'you' : action.approvedBy}
						</code>
					)}
					{action.approvedAt && ' '}
				</>
			)}
			{action.approvedAt && (
				<Tooltip>
					<TooltipTrigger asChild>
						<span
							className="hover:text-foreground cursor-pointer underline-offset-2 hover:underline"
							onClick={handleAuthorizedAtClick}
						>
							{formatLocalTimestamp(action.approvedAt)}
						</span>
					</TooltipTrigger>
					<TooltipContent side="top" className="max-w-sm">
						<div className="space-y-1">
							<div className="font-mono text-xs">{new Date(action.approvedAt).toISOString()}</div>
							<div className="text-xs">{formatLocalTimestamp(action.approvedAt)}</div>
						</div>
					</TooltipContent>
				</Tooltip>
			)}
			.
		</div>
	);
}

export function AuthorSection({
	action,
	isAuthorCurrentUser,
}: {
	action: Doc<'actions'>;
	isAuthorCurrentUser: boolean;
}) {
	//
	if (!action.author) return null;

	const handleClick = (event: MouseEvent) => {
		event.stopPropagation();

		if (!isAuthorCurrentUser) {
			const authorElement = document.getElementById(`action-${action.author}`);
			if (authorElement) {
				authorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
				window.location.hash = `#action-${action.author}`;
			}
		}

		copyToClipboard(action.author);
		toast.success('Copied ID to clipboard');
	};

	const statusText = statusTextFor({ action, isAuthorCurrentUser });

	return (
		<div className="text-xs text-muted-foreground">
			{statusText}{' '}
			<code
				className="hover:text-foreground cursor-pointer underline-offset-2 hover:underline"
				onClick={handleClick}
			>
				{isAuthorCurrentUser ? 'you' : action.author}
			</code>
			{action.status === 'skipped' ? ', but skipped.' : '.'}
		</div>
	);
}

function statusTextFor({
	action,
	isAuthorCurrentUser,
}: {
	action: Doc<'actions'>;
	isAuthorCurrentUser: boolean;
}) {
	//
	if (isAuthorCurrentUser) {
		switch (action.status) {
			case 'succeeded':
				return 'Performed by';
			case 'skipped':
				return 'Scheduled by';
			case 'failed':
				return 'Attempted to perform by';
			case 'running':
				return 'Performing by';
			default:
				return 'Performed by';
		}
	}

	switch (action.status) {
		case 'succeeded':
			return 'Performed as a reaction from';
		case 'skipped':
			return 'Scheduled as a reaction from';
		case 'failed':
			return 'Attempted to perform as a reaction from';
		case 'running':
			return 'Performing as a reaction from';
		case 'blocked':
			return 'Pending authorization as a reaction from';
		default:
			return 'Performed as a reaction from';
	}
}
