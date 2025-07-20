import { Doc, Id } from 'convex/_generated/dataModel';
import { AnalyzeAction } from '~/components/actions/AnalyzeAction';
import { CancelScheduleAction } from '~/components/actions/CancelScheduleAction';
import { ComposeAction } from '~/components/actions/ComposeAction';
import { DiscardAction } from '~/components/actions/DiscardAction';
import { DoneAction } from '~/components/actions/DoneAction';
import { GetSkillDetailsAction } from '~/components/actions/GetSkillDetailsAction';
import { IncreaseBudgetAction } from '~/components/actions/IncreaseBudgetAction';
import { LearnAction } from '~/components/actions/LearnAction';
import { MathAction } from '~/components/actions/MathAction';
import { ReasonAction } from '~/components/actions/ReasonAction';
import { RenderAction } from '~/components/actions/RenderAction';
import { RequestBudgetAction } from '~/components/actions/RequestBudgetAction';
import { ResolveAction } from '~/components/actions/ResolveAction';
import { SayAction } from '~/components/actions/SayAction';
import { ScheduleAction } from '~/components/actions/ScheduleAction';
import { ScrapeLinkAction } from '~/components/actions/ScrapeLinkAction';
import { ScrapeTweetAction } from '~/components/actions/ScrapeTweetAction';
import { SearchPlacesAction } from '~/components/actions/SearchPlacesAction';
import { SearchWebAction } from '~/components/actions/SearchWebAction';
import { SetUserInfoAction } from '~/components/actions/SetUserInfoAction';
import { SkillAction } from '~/components/actions/SkillAction';
import { StopAction } from '~/components/actions/StopAction';
import { ThinkingAction } from '~/components/actions/ThinkingAction';
import { TwitterSearchAction } from '~/components/actions/TwitterSearchAction';
import { UpdateInstructionsAction } from '~/components/actions/UpdateInstructionsAction';

export type ActionComponentProps = {
	className?: string;
	action: Doc<'actions'>;
	initialRenderDate: Date;
	isAuthorCurrentUser: boolean;
	taskId: Id<'tasks'>;
};

export default {
	instruct: ThinkingAction,
	iterate: ThinkingAction,
	say: SayAction,
	render: RenderAction,
	compose: ComposeAction,
	justSay: SayAction,
	requestBudget: RequestBudgetAction,
	increaseBudget: IncreaseBudgetAction,
	done: DoneAction,
	resolve: ResolveAction,
	discard: DiscardAction,
	askForClarification: SayAction,
	analyze: AnalyzeAction,
	searchWeb: SearchWebAction,
	valyu_search: SearchWebAction,
	twitter_search: TwitterSearchAction,
	scrapeTweet: ScrapeTweetAction,
	updateInstructions: UpdateInstructionsAction,
	scrapeLink: ScrapeLinkAction,
	searchPlaces: SearchPlacesAction,
	reason: ReasonAction,
	schedule: ScheduleAction,
	cancelSchedule: CancelScheduleAction,
	setUserInfo: SetUserInfoAction,
	stop: StopAction,
	//
	learnSkill: LearnAction,
	createSkill: SkillAction,
	updateSkill: SkillAction,
	getSkillDetails: GetSkillDetailsAction,
	//
	// math skills
	multiply: MathAction,
	sum: MathAction,
	subtract: MathAction,
	divide: MathAction,

	// hidden
	requestIteration: null,
};
