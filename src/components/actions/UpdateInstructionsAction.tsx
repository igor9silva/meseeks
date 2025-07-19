import { ActionComponentProps } from '~/components/actions';

import { z } from 'zod';
import { GenericAction } from '~/components/actions/GenericAction';
import { FailedMessage, SimpleMessage } from '~/components/ui/message';

export function UpdateInstructionsAction(props: ActionComponentProps) {
	//
	const { action, isAuthorCurrentUser } = props;
	// const isNew = useIsNew(action._creationTime, initialRenderDate);

	const args = argsSchema.parse(action.args);

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
					text={`🚫 Failed to update instructions`}
					error={action.result.text ?? ''}
					isAuthorCurrentUser={isAuthorCurrentUser}
				/>
			);

		case 'running':
			return (
				<SimpleMessage
					running
					text={`✍️ Updating task instructions`}
					isAuthorCurrentUser={isAuthorCurrentUser}
				/>
			);

		case 'succeeded':
			//
			const updatedFields = Object.entries(args).filter(([_, value]) => value !== undefined);

			if (updatedFields.length === 0) {
				return <SimpleMessage text={`Updated task.`} isAuthorCurrentUser={isAuthorCurrentUser} />;
			}

			const fieldNames = updatedFields.map(([key]) => key);
			let updatedFieldsString: string;

			if (fieldNames.length === 1) {
				updatedFieldsString = fieldNames[0];
			} else if (fieldNames.length === 2) {
				updatedFieldsString = `${fieldNames[0]} and ${fieldNames[1]}`;
			} else {
				const lastField = fieldNames[fieldNames.length - 1];
				const remainingFields = fieldNames.slice(0, -1);
				updatedFieldsString = `${remainingFields.join(', ')} and ${lastField}`;
			}

			return (
				<SimpleMessage
					text={`Updated task ${updatedFieldsString}.`}
					isAuthorCurrentUser={isAuthorCurrentUser}
				/>
			);
	}
}

const argsSchema = z.object({
	title: z
		.string()
		.optional()
		.describe('A short title for the task. **Max 60 characters** (will truncate if longer).'),
	instructions: z
		.string()
		.optional()
		.describe(`MDX. Add any details on how to handle the task, what should be done, how, references, etc.`),
	summary: z
		.string() //
		.optional()
		.describe(`MDX. Add any details on what we have done so far. Bullet points are preferred.`),
	availableSkills: z
		.array(z.string())
		.max(16)
		.optional()
		.describe(
			'List of skill keys available for this task. Select up to 16 skills that will be available for this tasks. Make sure to select the most relevant skills for completing this task.',
		),
});
