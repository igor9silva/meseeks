import { askForClarification } from './askForClarification';
import { createSkill } from './createSkill';
import { decreaseBudget } from './decreaseBudget';
import { discard } from './discard';
import { done } from './done';
import { getSkillDetails } from './getSkillDetails';
import { increaseBudget } from './increaseBudget';
import { justSay } from './justSay';
import { lookAtMe } from './lookAtMe';
import { reason } from './reason';
import { render } from './render';
import { reopen } from './reopen';
import { requestBudget } from './requestBudget';
import { requestIteration } from './requestIteration';
import { resolve } from './resolve';
import { say } from './say';
import { setUserInfo } from './setUserInfo';
import { stop } from './stop';
import { updateInstructions } from './updateInstructions';
import { updateSkill } from './updateSkill';

export const _builtInSkills = {
	//
	// loop entry
	askForClarification,
	updateInstructions,

	// lifecycle
	say,
	render,
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

	// skills
	createSkill,
	updateSkill,
	getSkillDetails,

	// user info
	setUserInfo,
};
