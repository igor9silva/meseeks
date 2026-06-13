export const trustedIntelligences = [
	{
		key: 'deepseek/deepseek-v4-flash',
		label: 'DeepSeek v4 Flash',
		provider: 'deepseek',
		model: 'deepseek-v4-flash',
	},
	{
		key: 'deepseek/deepseek-v4-pro',
		label: 'DeepSeek v4 Pro',
		provider: 'deepseek',
		model: 'deepseek-v4-pro',
	},
	{
		key: 'moonshot/kimi-k2.5',
		label: 'Kimi K2.5',
		provider: 'moonshot',
		model: 'kimi-k2.5',
	},
	{
		key: 'moonshot/kimi-k2.6',
		label: 'Kimi K2.6',
		provider: 'moonshot',
		model: 'kimi-k2.6',
	},
	{
		key: 'openai/gpt-5.5',
		label: 'GPT 5.5',
		provider: 'openai',
		model: 'gpt-5.5',
	},
	{
		key: 'openai/gpt-5.5-pro',
		label: 'GPT 5.5 Pro',
		provider: 'openai',
		model: 'gpt-5.5-pro',
	},
	{
		key: 'openai/gpt-5.4-mini',
		label: 'GPT 5.4 mini',
		provider: 'openai',
		model: 'gpt-5.4-mini',
	},
] as const;

export type TrustedIntelligence = (typeof trustedIntelligences)[number];
export type TrustedIntelligenceKey = TrustedIntelligence['key'];

export const trustedIntelligenceKeys = trustedIntelligences.map((entry) => entry.key);

export const getTrustedIntelligence = (key: string) => trustedIntelligences.find((entry) => entry.key === key);
