import { z } from 'zod/v3';
import { defineSkill, ExecutionResult, ToolExecution } from '../defineSkill';

export const lookAtMe = defineSkill({
	preApprovedCost: 0n,
	description: 'Onboard a new user with welcome messages and collect their personal information.',
	parameters: z.object({}),
	knownReactions: [
		{
			skillKey: 'justSay',
			args: {
				message: '## Welcome to Meseeks! 👋',
			},
			condition: 'any',
		},
		{
			skillKey: 'justSay',
			args: {
				message:
					'Meseeks is an open-source AI companion ("agents" are so 2024) that runs autonomously and learns from your decisions.',
			},
			condition: 'any',
		},
		{
			skillKey: 'justSay',
			args: {
				message:
					'It enables businesses to run with minimal human supervision by combining AI decision-making ("soft skills") with HTTP/MCP integrations ("hard skills").',
			},
			condition: 'any',
		},
		{
			skillKey: 'justSay',
			args: {
				message:
					"### All while maintaining:\n\n🔘 **transparency** (you pay what it costs, not a penny more!)\n🔘 **accountability** (every Meseeks re-action is traceable to a human action)\n🔘 **trust** (it's safe, open and verifiable)\n🔘 **control** (system-enforced rules, autonomy grows relative to your trust)",
			},
			condition: 'any',
		},
		{
			skillKey: 'justSay',
			args: {
				message:
					'In simple terms, it feels like you just hired someone. A very capable, fast learner and infinitely scalable new hire for your business — or life.',
			},
			condition: 'any',
		},
		{
			skillKey: 'justSay',
			args: {
				message:
					'### ⚠️ This is a research preview\n\n- Do not share sensitive, confidential, or personal data with Meseeks. Treat all inputs as potentially public and non‑secure.\n- Maintain your own backups. Do not rely on Meseeks as the sole repository for important information or content.\n- Validate critical outputs. Responses may contain errors, be incomplete, or become outdated quickly. Always verify crucial information independently before acting on it.\n-Expect things to change fast and break.\n- Use at your own risk. By continuing to use Meseeks during this research phase, you acknowledge these limitations and agree that Meseeks shall not be liable for any loss, damage, or harm arising from your reliance on it.',
			},
			condition: 'any',
		},
		{
			skillKey: 'justSay',
			args: {
				message:
					'### Getting Started\n\nAt the beginning, it requires some energy from you. But the more you use it, the more you trust it, and the more you delegate to it.\n\nMeseeks is still very early, but already very capable. Start by giving me a task and see what happens! 🚀',
			},
			condition: 'any',
		},
		{
			skillKey: 'justSay',
			args: {
				message:
					"### Let me get to know you better\n\nTo provide you with the best assistance, I'd like to learn about you. Could you tell me a bit about yourself? Things like your name, background, interests, profession, or anything else you'd like me to know?",
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
				text: 'Welcome aboard!',
				reactions: execution.skill.knownReactions,
			};
		},
	hidden: true,
});
