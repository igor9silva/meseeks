import { ChevronDown, CodeXml } from 'lucide-react';
import { useState } from 'react';

import { ActionComponentProps } from '~/components/actions';
import { GenericAction } from '~/components/actions/GenericAction';
import { CodeBlock, CodeBlockCode } from '~/components/ui/code-block';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible';
import { FailedMessage, Message, SimpleMessage } from '~/components/ui/message';
import { cn } from '~/lib/utils';

export function AnalyzeAction(props: ActionComponentProps) {
	//
	const { action, isAuthorCurrentUser } = props;

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
			return <SimpleMessage running text={`Running code...`} isAuthorCurrentUser={isAuthorCurrentUser} />;

		case 'succeeded':
			return <Success {...props} />;
	}
}

function Error({ action, isAuthorCurrentUser }: ActionComponentProps) {
	return (
		<FailedMessage
			text={`🚫 Failed to run code`}
			error={action.result?.text ?? ''}
			isAuthorCurrentUser={isAuthorCurrentUser}
		/>
	);
}

function Success(props: ActionComponentProps) {
	//
	const { action, isAuthorCurrentUser, className } = props;
	const [isOpen, setIsOpen] = useState(false);

	const code = action.args['code'] as string;
	const language = action.args['language'] as string | undefined;
	const output = action.result?.text ?? '';

	return (
		<Message isAuthorCurrentUser={isAuthorCurrentUser} className={className}>
			<div
				className={cn('rounded-xl p-2 text-foreground w-full md:w-[95%]', {
					'bg-primary text-primary-foreground': isAuthorCurrentUser,
					'bg-secondary text-secondary-foreground': !isAuthorCurrentUser,
				})}
			>
				<Collapsible open={isOpen} onOpenChange={setIsOpen}>
					<CollapsibleTrigger className="flex cursor-pointer items-center gap-1 text-sm text-muted-foreground">
						<CodeXml className="size-4" />
						<span>Run code</span>
						<div className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
							<ChevronDown className="size-4" />
						</div>
					</CollapsibleTrigger>

					{/* Output - always shown */}
					<div className="mt-2 space-y-2">
						{isOpen && <div className="text-sm font-medium text-foreground">Output</div>}
						<div
							className={cn('border border-border bg-background rounded-md p-3 overflow-auto', {
								'max-h-64': isOpen,
								'max-h-32': !isOpen,
							})}
						>
							<pre className="whitespace-pre text-sm font-mono text-foreground">
								{output || '(no output)'}
							</pre>
						</div>
					</div>

					<CollapsibleContent className="mt-2 space-y-3">
						{/* Code - shown only when expanded */}
						<div className="text-sm font-medium text-foreground">Code</div>
						<div className="max-h-80 overflow-auto">
							<CodeBlock>
								<CodeBlockCode code={code} language={language ?? 'python'} />
							</CodeBlock>
						</div>
					</CollapsibleContent>
				</Collapsible>
			</div>
		</Message>
	);
}
