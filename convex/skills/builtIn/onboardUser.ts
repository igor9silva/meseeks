import { z } from 'zod';
import { defineSkill, ExecutionResult, ToolExecution } from '../defineSkill';

export const onboardUser = defineSkill({
	preApprovedCost: 0n,
	description: 'Onboard a new user with welcome messages',
	parameters: z.object({}),
	knownReactions: [
		{
			skillKey: 'say',
			args: {
				message: '## Welcome to Meseeks! 👋',
			},
			condition: 'any',
		},
		{
			skillKey: 'say',
			args: {
				message:
					'Meseeks is an open-source AI companion ("agents" are so 2024) that runs autonomously and learns from your decisions.',
			},
			condition: 'any',
		},
		{
			skillKey: 'say',
			args: {
				message:
					'It enables businesses to run with minimal human supervision by combining AI decision-making ("soft skills") with HTTP/MCP integrations ("hard skills").',
			},
			condition: 'any',
		},
		{
			skillKey: 'say',
			args: {
				message:
					"### All while maintaining:\n\n🔘 **transparency** (you pay what it costs, not a penny more!)\n🔘 **accountability** (every Meseeks re-action is traceable to a human action)\n🔘 **trust** (it's safe, open and verifiable)\n🔘 **control** (system-enforced rules, autonomy grows relative to your trust)",
			},
			condition: 'any',
		},
		{
			skillKey: 'say',
			args: {
				message:
					'In simple terms, it feels like you just hired someone. A very capable, fast learner and infinitely scalable new hire for your business — or life.',
			},
			condition: 'any',
		},
		{
			skillKey: 'say',
			args: {
				message:
					'### Getting Started\n\nAt the beginning, it requires some energy from you. But the more you use it, the more you trust it, and the more you delegate to it.\n\nMeseeks is still very early, but already very capable. Start by giving me a task and see what happens! 🚀',
			},
			condition: 'any',
		},
		{
			skillKey: 'done',
			args: {
				message: 'Welcome aboard!',
				reason: 'resolved',
			},
			condition: 'any',
		},
	],
	use:
		(execution: ToolExecution) =>
		async (args): Promise<ExecutionResult> => {
			//
			return {
				text: 'Starting onboarding process...',
				reactions: execution.skill.knownReactions,
			};
		},
});
