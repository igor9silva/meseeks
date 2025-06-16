import { Doc, Id } from 'convex/_generated/dataModel';

import index from './actions';
import { GenericAction } from './actions/GenericAction';

export function Action(props: {
	className?: string;
	action: Doc<'actions'>;
	initialRenderDate: Date;
	isAuthorCurrentUser: boolean;
	taskId: Id<'tasks'>;
}) {
	//
	if (props.action.skillKey in index) {
		const Component = index[props.action.skillKey as keyof typeof index];
		if (Component === null) return null;
		return <Component {...props} />;
	}

	return <GenericAction {...props} />;
}
