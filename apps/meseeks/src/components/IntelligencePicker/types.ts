import type { DisplayIntelligence, Intelligence } from 'schemas/intelligenceSchema';

export type IntelligencePickerOption = {
	key: string;
	name: string;
	provider: string;
	description?: string;
	target?: string;
	pricing?: Intelligence['pricing'];
	context?: Intelligence['context'];
	intelligenceLevel?: number;
	sourceKey?: string;
	budgetCeiling?: bigint | null;
};

export type IntelligencePickerResolvedOptions = {
	options: IntelligencePickerOption[];
	recommendedKeys: string[];
};

export type IntelligencePickerData = {
	recommended: DisplayIntelligence[];
	intelligences: DisplayIntelligence[];
};
