import { asDollars } from 'lib/money';
import { Intelligence } from 'schemas/intelligenceSchema';

/**
 * Formats a number of words into a human-readable string
 * @param words - Number of words to format
 * @returns Formatted string (e.g., "1.2M words", "150K words", "500 words")
 */
export function formatWordCount(words: number): string {
	if (words === 0) return 'Unknown';
	if (words >= 1_000_000) return `${(words / 1_000_000).toFixed(1)}M words`;
	if (words >= 1_000) return `${Math.round(words / 1_000)}K words`;
	return `${words} words`;
}

/**
 * Formats pricing BigInts into human-readable dollar strings
 * @param pricing - The pricing object with BigInt values
 * @returns Formatted pricing object with dollar strings
 */
export function formatPricing(pricing: Intelligence['pricing']) {
	return {
		input: asDollars({ bigInt: pricing.inputPerMillionToken }),
		output: asDollars({ bigInt: pricing.outputPerMillionToken }),
		estimatedPerMillionWords: asDollars({ bigInt: pricing.estimatedPerMillionWords }),
	};
}
