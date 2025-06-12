import { DiscardAction } from '~/components/actions/DiscardAction';
import { DoneAction } from '~/components/actions/DoneAction';
import { IncreaseBudgetAction } from '~/components/actions/IncreaseBudgetAction';
import { LearnAction } from '~/components/actions/LearnAction';
import { ReasonAction } from '~/components/actions/ReasonAction';
import { RequestBudgetAction } from '~/components/actions/RequestBudgetAction';
import { ResolveAction } from '~/components/actions/ResolveAction';
import { SayAction } from '~/components/actions/SayAction';
import { ScrapeLinkAction } from '~/components/actions/ScrapeLinkAction';
import { SearchPlacesAction } from '~/components/actions/SearchPlacesAction';
import { SearchWebAction } from '~/components/actions/SearchWebAction';
import { ThinkingAction } from '~/components/actions/ThinkingAction';
import { UpdateInstructionsAction } from '~/components/actions/UpdateInstructionsAction';

export default {
	instruct: ThinkingAction,
	iterate: ThinkingAction,
	say: SayAction,
	justSay: SayAction,
	requestBudget: RequestBudgetAction,
	increaseBudget: IncreaseBudgetAction,
	done: DoneAction,
	resolve: ResolveAction,
	discard: DiscardAction,
	askForClarification: SayAction,
	searchWeb: SearchWebAction,
	updateInstructions: UpdateInstructionsAction,
	scrapeLink: ScrapeLinkAction,
	searchPlaces: SearchPlacesAction,
	reason: ReasonAction,
	//
	createSkill: LearnAction,
	updateSkill: LearnAction,
	learn: LearnAction,

	// hidden
	requestIteration: null,
};
