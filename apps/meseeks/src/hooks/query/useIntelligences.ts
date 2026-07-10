import { INTELLIGENCES, displayIntelligence } from 'schemas/intelligenceSchema';

export function useIntelligences() {
	//
	return {
		intelligences: Object.values(INTELLIGENCES).map((intelligence) =>
			displayIntelligence({ key: intelligence.key }),
		),
	};
}
