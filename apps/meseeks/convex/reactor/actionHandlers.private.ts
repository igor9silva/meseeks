'use node';

import { runExecute } from './execute.private';
import { settleAction } from './ledger.private';
import { runThink } from './think.private';
import { runActionTriggers, runMutationTriggers } from './triggers.private';
import { errorMessage, numberArg, textArg } from './utils.private';
import { handleFileAction } from './fileActionHandlers.private';
import type { StartedAction } from './actionContext.private';

const handleSay = async (action: StartedAction) => {
	const message = textArg(action.args, 'message');
	await runActionTriggers(action.ctx, {
		owner: action.owner,
		directory: action.directory,
		sourceAction: action.actionId,
		sourceSkillKey: action.skillKey,
		sourceAuthor: action.author,
		message,
		depth: action.depth,
	});
	await settleAction(action.ctx, {
		owner: action.owner,
		directory: action.directory,
		actionId: action.actionId,
		status: 'succeeded',
		result: message || 'Said.',
	});
};

const handleThink = async (action: StartedAction) => {
	const selectedIntelligence =
		action.intelligenceKey ?? textArg(action.args, 'intelligenceKey', 'deepseek/deepseek-v4-flash');
	const output = await runThink(action.ctx, {
		owner: action.owner,
		directory: action.directory,
		actionId: action.actionId,
		intelligenceKey: selectedIntelligence,
		prompt: textArg(action.args, 'prompt'),
	});
	await settleAction(action.ctx, {
		owner: action.owner,
		directory: action.directory,
		actionId: action.actionId,
		status: 'succeeded',
		result: output.slice(0, 2000),
	});
};

const handleExecute = async (action: StartedAction) => {
	const languageValue = textArg(action.args, 'language', 'python');
	const language = languageValue === 'javascript' ? 'javascript' : 'python';
	const code = textArg(action.args, 'code') || textArg(action.args, 'command');
	const output = await runExecute(action.ctx, {
		owner: action.owner,
		directory: action.directory,
		actionId: action.actionId,
		language,
		code,
		timeoutSeconds: numberArg(action.args, 'timeoutSeconds', 60),
	});
	await runMutationTriggers(action.ctx, {
		owner: action.owner,
		directory: action.directory,
		sourceAction: action.actionId,
		sourceSkillKey: action.skillKey,
		sourceAuthor: action.author,
		changedPaths: output.changedFiles,
		depth: action.depth,
	});
	await settleAction(action.ctx, {
		owner: action.owner,
		directory: action.directory,
		actionId: action.actionId,
		status: 'succeeded',
		result: output.logs.slice(0, 2000),
	});
};

export const performStartedAction = async (action: StartedAction): Promise<void> => {
	try {
		if (action.skillKey === 'say') {
			await handleSay(action);
			return;
		}

		if (action.skillKey === 'think') {
			await handleThink(action);
			return;
		}

		if (action.skillKey === 'execute') {
			await handleExecute(action);
			return;
		}

		if (await handleFileAction(action)) return;

		if (action.skillKey === 'interrupt') {
			await settleAction(action.ctx, {
				owner: action.owner,
				directory: action.directory,
				actionId: action.actionId,
				status: 'skipped',
				result: 'Interrupted.',
			});
			return;
		}

		throw new Error(`Unknown Reactor action "${action.skillKey}".`);
	} catch (error) {
		await settleAction(action.ctx, {
			owner: action.owner,
			directory: action.directory,
			actionId: action.actionId,
			status: 'failed',
			error: errorMessage(error),
		});
		throw error;
	}
};
