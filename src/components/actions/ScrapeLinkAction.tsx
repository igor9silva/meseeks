import { useState } from 'react';
import { z } from 'zod/v3';
import { ActionComponentProps } from '~/components/actions';

import { Link } from '@tanstack/react-router';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { GenericAction } from '~/components/actions/GenericAction';
import { Button } from '~/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible';
import MDX from '~/components/ui/mdx';
import { Message, SimpleMessage } from '~/components/ui/message';

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
	//
	const url = action.args['url'] as string;
	const [isOpen, setIsOpen] = useState(false);

	return (
		<Message isAuthorCurrentUser={isAuthorCurrentUser}>
			<Collapsible open={isOpen} onOpenChange={setIsOpen} className="min-w-0 w-full">
				<CollapsibleTrigger className="flex items-start gap-2 min-w-0 w-full text-left">
					<div className="text-sm text-muted-foreground min-w-0 flex-1">
						<div className="break-words">
							Failed to read "
							<Link
								to={url}
								target="_blank"
								rel="noopener noreferrer"
								className="break-all hover:underline"
								onClick={(e) => e.stopPropagation()}
							>
								{url}
							</Link>
							"
						</div>
					</div>
					<Button
						variant="link"
						size="sm"
						className="text-muted-foreground p-1 flex-shrink-0 mt-0"
						onClick={() => setIsOpen(!isOpen)}
					>
						{isOpen ? <ChevronUp /> : <ChevronDown />}
					</Button>
				</CollapsibleTrigger>
				{action.result?.text && (
					<CollapsibleContent className="min-w-0 overflow-hidden">
						<div className="text-sm text-destructive mt-2 p-3 bg-destructive/10 rounded-md break-words">
							{action.result.text}
						</div>
					</CollapsibleContent>
				)}
			</Collapsible>
		</Message>
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
	const url = action.args['url'] as string;

	return (
		<Message isAuthorCurrentUser={isAuthorCurrentUser}>
			<Collapsible open={isOpen} onOpenChange={setIsOpen} className="min-w-0 w-full">
				<CollapsibleTrigger className="flex items-start gap-2 min-w-0 w-full text-left">
					<div className="text-sm text-muted-foreground min-w-0 flex-1">
						<div className="break-words">
							🧵 Read "
							<Link
								to={url}
								target="_blank"
								rel="noopener noreferrer"
								className="break-all hover:underline"
								onClick={(e) => e.stopPropagation()}
							>
								{url}
							</Link>
							"
						</div>
					</div>
					<Button
						variant="link"
						size="sm"
						className="text-muted-foreground p-1 flex-shrink-0 mt-0"
						onClick={() => setIsOpen(!isOpen)}
					>
						{isOpen ? <ChevronUp /> : <ChevronDown />}
					</Button>
				</CollapsibleTrigger>
				<CollapsibleContent className="min-w-0 overflow-hidden">
					<div className="max-w-full max-h-96 overflow-auto bg-muted/30 rounded-md p-4 mt-2">
						<MDX text={data.markdown} shouldRenderComponents={false} />
					</div>
				</CollapsibleContent>
			</Collapsible>
		</Message>
	);
}
