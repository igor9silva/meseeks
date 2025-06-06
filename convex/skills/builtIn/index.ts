import { askForClarification } from './askForClarification';
import { createSkill } from './createSkill';
import { discard } from './discard';
import { divide } from './divide';
import { done } from './done';
import { increaseBudget } from './increaseBudget';
import { multiply } from './multiply';
import { onboardUser } from './onboardUser';
import { reason } from './reason';
import { reopen } from './reopen';
import { requestBudget } from './requestBudget';
import { requestIteration } from './requestIteration';
import { resolve } from './resolve';
import { say } from './say';
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
	done,
	stop,
	reason,
	reopen,
	increaseBudget,
	resolve,
	requestBudget,
	discard,
	requestIteration,
	onboardUser,

	// skills
	createSkill,
	updateSkill,
};

// updateSummary,
// moveTask,
// createSubtask,
