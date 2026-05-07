/**
 * Extends the BigInt prototype to add a toJSON method
 * This allows BigInt values to be properly serialized with JSON.stringify
 */

import { asDollars } from 'lib/money';

// Extend the BigInt prototype
if (typeof BigInt !== 'undefined') {
	// @ts-ignore - Adding toJSON method to BigInt prototype
	// eslint-disable-next-line no-extend-native
	BigInt.prototype.toJSON = function () {
		//
		return asDollars({ bigInt: this.valueOf() });
	};
}

// Export a dummy function to make this a proper module
export function setupBigIntSerialization() {
	//
	// This function doesn't need to do anything as the prototype extension happens when the file is imported
	return true;
}
