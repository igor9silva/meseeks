import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';
import { ActionComponentProps } from '~/components/actions';

import { GenericAction } from '~/components/actions/GenericAction';
import { Button } from '~/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible';
import { FailedMessage, Message, MessageContent, SimpleMessage } from '~/components/ui/message';

export function SearchPlacesAction(props: ActionComponentProps) {
	//
	const { action, initialRenderDate, isAuthorCurrentUser, taskId } = props;
	// const isNew = useIsNew(action._creationTime, initialRenderDate);

	switch (action.status) {
		//
		case 'enqueued':
		case 'skipped':
			return null;

		case 'pending authorization':
			return <GenericAction {...props} />;

		case 'failed':
			return <Error {...props} />;

		case 'running':
			return (
				<SimpleMessage
					running
					text={`📍 Searching places "${action.args['query']}"`}
					isAuthorCurrentUser={isAuthorCurrentUser}
				/>
			);

		case 'succeeded':
			return <Success {...props} />;
	}
}

const SearchResultSchema = z.object({
	places: z.array(
		z.object({
			id: z.string().optional(),
			displayName: z.object({
				text: z.string(),
				languageCode: z.string(),
			}),
			primaryType: z.string().optional(),
			googleMapsUri: z.string().optional(),
			formattedAddress: z.string().optional(),
		}),
	),
});

function Error({ action, isAuthorCurrentUser }: ActionComponentProps) {
	return (
		<FailedMessage
			text={`Failed to search places "${action.args['query']}"`}
			error={action.result?.text ?? ''}
			isAuthorCurrentUser={isAuthorCurrentUser}
		/>
	);
}

function Success(props: ActionComponentProps) {
	//
	const { action, isAuthorCurrentUser } = props;

	const response = SearchResultSchema.safeParse(JSON.parse(action.result?.text ?? '{}'));

	if (!response.success) {
		console.warn('Invalid (or no) result found succeeded action', action._id);
		return <Error {...props} />;
	}

	const { places } = response.data;
	const [isOpen, setIsOpen] = useState(false);

	return (
		<Message isAuthorCurrentUser={isAuthorCurrentUser}>
			<Collapsible open={isOpen} onOpenChange={setIsOpen}>
				<CollapsibleTrigger className="flex gap-0 items-center">
					<MessageContent
						className="text-sm text-muted-foreground text-left"
						text={`📍 Found ${places.length} places for "${action.args['query']}"`}
					/>
					<Button
						variant="link"
						size="sm"
						className="text-muted-foreground p-1"
						onClick={() => setIsOpen(!isOpen)}
					>
						{isOpen ? <ChevronUp /> : <ChevronDown />}
					</Button>
				</CollapsibleTrigger>
				<CollapsibleContent>
					<ul>
						{places.map((place) => (
							<li key={place.id}>
								<a className="text-blue-500 hover:underline" rel="noopener" href={place.googleMapsUri}>
									<p className="text-sm">{place.displayName.text}</p>
									<p className="text-xs text-muted-foreground">{place.formattedAddress}</p>
								</a>
							</li>
						))}
					</ul>
				</CollapsibleContent>
			</Collapsible>
		</Message>
	);
}
