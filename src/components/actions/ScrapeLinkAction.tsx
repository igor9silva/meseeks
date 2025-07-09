import { useState } from 'react';
import { z } from 'zod';
import { ActionComponentProps } from '~/components/actions';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { GenericAction } from '~/components/actions/GenericAction';
import { Button } from '~/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible';
import { FailedMessage, Message, MessageContent, SimpleMessage } from '~/components/ui/message';

export function ScrapeLinkAction(props: ActionComponentProps) {
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
					text={`🧵 Reading "${action.args['url']}"`}
					isAuthorCurrentUser={isAuthorCurrentUser}
				/>
			);

		case 'succeeded':
			return <Success {...props} />;
	}
}

const ScrapeResultSchema = z.object({
	success: z.literal(true),
	data: z.object({
		// metadata: z.object({
		// 	// 'title': 'Portugal’s New IFICI – NHR 2.0 Framework 2025 – Best Citizenships',
		// 	// 'favicon': 'https://best-citizenships.com/wp-content/uploads/2024/05/cropped-favicon-32x32.png',
		// 	// 'viewport': 'width=device-width, initial-scale=1',
		// 	// 'robots': 'max-image-preview:large',
		// 	// 'language': 'en-US',
		// 	// 'generator': 'WordPress 6.7.2',
		// 	// 'msapplication-TileImage':
		// 	// 	'https://best-citizenships.com/wp-content/uploads/2024/05/cropped-favicon-270x270.png',
		// 	// 'scrapeId': '75d3ffac-821c-4e24-a9de-2681cba33dba',
		// 	// 'sourceURL': 'https://best-citizenships.com/2025/02/24/portugals-new-ifici-nhr-2-0-framework-2025/',
		// 	// 'url': 'https://best-citizenships.com/2025/02/24/portugals-new-ifici-nhr-2-0-framework-2025/',
		// 	// 'statusCode': 200,

		// }),
		markdown: z.string(),
	}),
});

function Error({ action, isAuthorCurrentUser }: ActionComponentProps) {
	return (
		<FailedMessage
			text={`🚫 Failed to read "${action.args['url']}"`}
			error={action.result?.text ?? ''}
			isAuthorCurrentUser={isAuthorCurrentUser}
		/>
	);
}

function Success(props: ActionComponentProps) {
	//
	const { action, isAuthorCurrentUser } = props;
	//
	const response = ScrapeResultSchema.safeParse(JSON.parse(action.result?.text ?? '{}'));

	if (!response.success) {
		console.warn('Invalid (or no) result found succeeded action', action._id);
		return <Error {...props} />;
	}

	const { data } = response.data;
	const [isOpen, setIsOpen] = useState(false);

	return (
		<Message isAuthorCurrentUser={isAuthorCurrentUser}>
			<Collapsible open={isOpen} onOpenChange={setIsOpen} className="min-w-0 w-full">
				<CollapsibleTrigger className="flex gap-0 items-center">
					<MessageContent
						className="text-sm text-muted-foreground text-left"
						text={`🧵 Read "${action.args['url']}"`}
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
				<CollapsibleContent className="min-w-0 overflow-x-auto">
					<SimpleMessage text={data.markdown} isAuthorCurrentUser={isAuthorCurrentUser} />
				</CollapsibleContent>
			</Collapsible>
		</Message>
	);
}
