import { Doc, Id } from 'convex/_generated/dataModel';
import { useState } from 'react';
import { z } from 'zod';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { GenericAction } from '~/components/actions/GenericAction';
import { Button } from '~/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible';
import { FailedMessage, Message, MessageContent, SimpleMessage } from '~/components/ui/message';

export function ScrapeLinkAction(props: {
	className?: string;
	action: Doc<'actions'>;
	initialRenderDate: Date;
	isAuthorCurrentUser: boolean;
	taskId: Id<'tasks'>;
}) {
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
			return <Error action={action} isAuthorCurrentUser={isAuthorCurrentUser} />;

		case 'running':
			return (
				<SimpleMessage
					running
					text={`🧵 Reading "${action.args['url']}"`}
					isAuthorCurrentUser={isAuthorCurrentUser}
				/>
			);

		case 'succeeded':
			return <Success isAuthorCurrentUser={isAuthorCurrentUser} action={action} />;
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

function Error({ action, isAuthorCurrentUser }: { action: Doc<'actions'>; isAuthorCurrentUser: boolean }) {
	return (
		<FailedMessage
			text={`🚫 Failed to read "${action.args['url']}"`}
			error={action.result?.text ?? ''}
			isAuthorCurrentUser={isAuthorCurrentUser}
		/>
	);
}

function Success({ action, isAuthorCurrentUser }: { action: Doc<'actions'>; isAuthorCurrentUser: boolean }) {
	//
	const response = ScrapeResultSchema.safeParse(JSON.parse(action.result?.text ?? '{}'));

	if (!response.success) {
		console.warn('Invalid (or no) result found succeeded action', action._id);
		return <Error action={action} isAuthorCurrentUser={isAuthorCurrentUser} />;
	}

	const { data } = response.data;
	const [isOpen, setIsOpen] = useState(false);

	return (
		<Message isAuthorCurrentUser={isAuthorCurrentUser}>
			<Collapsible open={isOpen} onOpenChange={setIsOpen}>
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
				<CollapsibleContent>
					<SimpleMessage text={data.markdown} isAuthorCurrentUser={isAuthorCurrentUser} />
				</CollapsibleContent>
			</Collapsible>
		</Message>
	);
}
