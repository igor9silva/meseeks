import { Doc, Id } from 'convex/_generated/dataModel';

import { componentForActionSkill } from './actions';

export function Action(props: {
	className?: string;
	action: Doc<'actions'>;
	initialRenderDate: Date;
	isAuthorCurrentUser: boolean;
	suppressAnchorId?: boolean;
	fileId: Id<'files'>;
}) {
	//
	const Component = componentForActionSkill({ skillKey: props.action.skillKey });

	return <Component {...props} />;
}
