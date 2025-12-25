import { Doc, Id } from 'convex/_generated/dataModel';
import { cn } from '~/lib/utils';

import { simplifiedSkillSchema } from 'convex/schemas/skillSchema';
import { z } from 'zod';
import { ActionComponentProps } from '~/components/actions';
import { LoadingButton } from '~/components/ui/loading-button';
import { FailedMessage, SimpleMessage } from '~/components/ui/message';
import { useApproveAction, useRejectAction } from '~/hooks/useTaskMutations';

export function SkillAction(props: ActionComponentProps) {
	//
	const { action, isAuthorCurrentUser, taskId, initialRenderDate } = props;

	const isCreation = action.skillKey === 'createSkill';

	switch (action.status) {
		//
		case 'enqueued':
		case 'skipped':
			return null;

		case 'pending authorization':
			return <PendingAuthorization action={action} taskId={taskId} initialRenderDate={initialRenderDate} />;

		case 'failed':
			return (
				<FailedMessage
					text={`🚫 Failed to ${isCreation ? 'learn' : 'update'} skill`}
					error={action.result?.text ?? ''}
					isAuthorCurrentUser={isAuthorCurrentUser}
				/>
			);

		case 'running':
			return (
				<SimpleMessage
					running
					text={isCreation ? '📖 Learning new skill...' : '🔧 Updating skill instructions...'}
					isAuthorCurrentUser={isAuthorCurrentUser}
				/>
			);

		case 'succeeded':
			return (
				<SimpleMessage
					text={action.result.text ?? (isCreation ? '📖 New skill learned' : '🔧 Skill updated')}
					isAuthorCurrentUser={isAuthorCurrentUser}
				/>
			);
	}
}

function PendingAuthorization({
	action,
	taskId,
	initialRenderDate,
}: {
	action: Doc<'actions'>;
	taskId: Id<'tasks'>;
	initialRenderDate: Date;
}) {
	const { approveAction, isApprovingAction } = useApproveAction();
	const { rejectAction, isRejectingAction } = useRejectAction();
	// const isNew = useMemo(() => {
	// 	return new Date(action._creationTime) > initialRenderDate;
	// }, [action, initialRenderDate]);
	const isNew = true;

	const handleApprove = () => {
		if (isApprovingAction) return;
		approveAction({ taskId, actionId: action._id });
	};

	const handleReject = () => {
		if (isRejectingAction) return;
		rejectAction({ taskId, actionId: action._id });
	};

	// Extract skill details from arguments
	const skill = action.args?.['skill'] as z.infer<typeof simplifiedSkillSchema>;

	const isCreation = action.skillKey === 'createSkill';
	const title = isCreation ? 'Learn skill' : 'Update skill';
	const isHardSkill = skill.kind === 'hard';

	// Extract domain from URL for Hard Skills
	let domain: string | undefined;
	if (isHardSkill && skill.config?.url) {
		try {
			const url = new URL(skill.config.url);
			domain = url.hostname;
		} catch {
			// Invalid URL, ignore
			console.warn('Invalid URL', skill.config.url);
		}
	}

	return (
		<div
			className={cn(
				'flex flex-col gap-3 p-4 rounded-3xl border bg-secondary text-secondary-foreground shadow-sm',
				{
					'animate-in duration-100': isNew,
					'slide-in-from-left': isNew,
				},
			)}
		>
			{/* Header */}
			<div className="flex items-center gap-3">
				<div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
					<span className="text-sm">📖</span>
				</div>
				<div>
					<h3 className="font-semibold">
						{title} <code>{skill.key}</code>
					</h3>
					<p className="text-sm text-muted-foreground">
						Skill {isCreation ? 'creation' : 'modification'} requires your authorization
					</p>
				</div>
			</div>

			{/* Skill Details */}
			{skill.key && (
				<>
					{skill.description && (
						<div className="space-y-1">
							<p className="text-sm">{skill.description}</p>
						</div>
					)}

					{isHardSkill && domain && (
						<div className="flex items-center gap-2 text-sm font-mono">
							<span className="text-muted-foreground">{skill.config.method}</span>
							<span className="bg-background px-2 py-1 rounded-lg border">{domain}</span>
						</div>
					)}

					{!isHardSkill && skill.config.instructions && (
						<div className="space-y-1">
							<span className="text-sm font-medium text-muted-foreground">
								{isCreation ? 'Instructions' : 'Updated Instructions'}:
							</span>
							<div className="text-sm max-h-32 overflow-y-auto bg-background p-2 rounded-lg border">
								<pre className="whitespace-pre-wrap text-xs">{skill.config.instructions}</pre>
							</div>
						</div>
					)}
				</>
			)}

			{/* Action Buttons */}
			<div className="flex gap-2 pt-2">
				<LoadingButton
					size="sm"
					onClick={handleApprove}
					loading={isApprovingAction}
					loadingText="Authorizing..."
				>
					Authorize
				</LoadingButton>
				<LoadingButton
					size="sm"
					variant="outline"
					onClick={handleReject}
					loading={isRejectingAction}
					loadingText="Cancelling..."
				>
					Cancel
				</LoadingButton>
			</div>
		</div>
	);
}
