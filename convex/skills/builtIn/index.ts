import { askForClarification } from './askForClarification';
import { cancelSchedule } from './cancelSchedule';
import { createSkill } from './createSkill';
import { decreaseBudget } from './decreaseBudget';
import { discard } from './discard';
import { divide } from './divide';
import { done } from './done';
import { increaseBudget } from './increaseBudget';
import { justSay } from './justSay';
import { lookAtMe } from './lookAtMe';
import { multiply } from './multiply';
import { reason } from './reason';
import { reopen } from './reopen';
import { requestBudget } from './requestBudget';
import { requestIteration } from './requestIteration';
import { resolve } from './resolve';
import { say } from './say';
import { schedule } from './schedule';
import { setUserInfo } from './setUserInfo';
import { stop } from './stop';
import { subtract } from './subtract';
import { sum } from './sum';
import { updateInstructions } from './updateInstructions';
import { updateSkill } from './updateSkill';

export const _builtInSkills = {
	//
	// loop entry
	askForClarification,
	updateInstructions,

	// math
	sum,
	multiply,
	divide,
	subtract,

	// lifecycle
	say,
	justSay, // TODO: this is a workaround to avoid reactions on the onboarding
	done,
	stop,
	reason,
	reopen,
	increaseBudget,
	decreaseBudget,
	resolve,
	requestBudget,
	discard,
	requestIteration,
	lookAtMe,

	// scheduling
	schedule,
	cancelSchedule,

	// skills
	createSkill,
	updateSkill,

	// user info
	setUserInfo,
};

// moveTask,
// createSubtask,
