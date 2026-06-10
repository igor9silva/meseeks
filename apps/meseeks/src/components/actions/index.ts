import { Doc, Id } from 'convex/_generated/dataModel';
import { AnalyzeAction } from '~/components/actions/AnalyzeAction';
import { UpdateBudgetAction } from '~/components/actions/UpdateBudgetAction';
import { GenericAction } from '~/components/actions/GenericAction';
import { SayAction } from '~/components/actions/SayAction';
import { ThinkingAction } from '~/components/actions/ThinkingAction';
import { UpdateFileAction } from '~/components/actions/UpdateFileAction';

export type ActionComponentProps = {
	className?: string;
	action: Doc<'actions'>;
	initialRenderDate: Date;
	isAuthorCurrentUser: boolean;
	suppressAnchorId?: boolean;
	fileId: Id<'files'>;
};

export function componentForActionSkill({ skillKey }: { skillKey: string }) {
	//
	if (skillKey === 'think') return ThinkingAction;
	if (skillKey === 'plan') return UpdateFileAction;
	if (skillKey === 'iterate') return ThinkingAction;
	if (skillKey === 'execute') return AnalyzeAction;
	if (skillKey === 'updateBudget') return UpdateBudgetAction;
	if (skillKey === 'updateFileMetadata') return UpdateFileAction;
	if (skillKey === 'rename') return UpdateFileAction;
	if (skillKey === 'updateFileContent') return UpdateFileAction;
	if (skillKey === 'tag') return UpdateFileAction;
	if (skillKey === 'move') return UpdateFileAction;
	if (skillKey === 'say') return SayAction;

	return GenericAction;
}
