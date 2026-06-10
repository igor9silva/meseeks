import { ActionComponentProps } from '~/components/actions';

import { z } from 'zod/v3';
import { GenericAction } from '~/components/actions/GenericAction';
import { FailedMessage, SimpleMessage } from '~/components/ui/message';

export function UpdateFileAction(props: ActionComponentProps) {
	//
	const { action, isAuthorCurrentUser } = props;
	// const isNew = useIsNew(action._creationTime, initialRenderDate);

	const updatedFields = updatedFileFields(action);

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
					text={`Failed to update file`}
					error={action.result?.text ?? ''}
					isAuthorCurrentUser={isAuthorCurrentUser}
				/>
			);

		case 'running':
			return <SimpleMessage running text={`✍️ Updating file`} isAuthorCurrentUser={isAuthorCurrentUser} />;

		case 'succeeded':
			//
			if (updatedFields.length === 0) {
				return <SimpleMessage text={`Updated file.`} isAuthorCurrentUser={isAuthorCurrentUser} />;
			}

			const fieldNames = updatedFields;
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
					text={`Updated file ${updatedFieldsString}.`}
					isAuthorCurrentUser={isAuthorCurrentUser}
				/>
			);
	}
}

function updatedFileFields(action: ActionComponentProps['action']) {
	//
	if (action.skillKey === 'plan') return planUpdatedFields(action.result?.metadata);

	const parsed = argsSchema.safeParse(action.args);
	if (!parsed.success) return [];

	return Object.entries(parsed.data)
		.filter((entry) => entry[1] !== undefined)
		.map((entry) => entry[0]);
}

function planUpdatedFields(metadata: Record<string, unknown> | undefined) {
	//
	const parsed = planMutationSchema.safeParse(metadata?.['planMutation']);
	if (!parsed.success) return [];

	const fields = [];
	if (parsed.data.title !== undefined) fields.push('title');
	if (parsed.data.body !== undefined) fields.push('content');
	if (parsed.data.tags.length > 0 || parsed.data.shouldRemoveInboxTag) fields.push('tags');

	return fields;
}

const argsSchema = z.object({
	name: z.string().optional().describe('A short name for the file. **Max 60 characters** (will truncate if longer).'),
	content: z
		.string()
		.optional()
		.describe(`MDX. Add any details on how to handle the file, what should be done, how, references, etc.`),
	summary: z
		.string() //
		.optional()
		.describe(`MDX. Add any details on what we have done so far. Bullet points are preferred.`),
});

const planMutationSchema = z.object({
	title: z.string().optional(),
	body: z.string().optional(),
	tags: z
		.array(
			z.object({
				key: z.string(),
				value: z.string(),
			}),
		)
		.default([]),
	shouldRemoveInboxTag: z.boolean().default(false),
});
