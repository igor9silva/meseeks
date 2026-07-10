import { asDollars } from 'lib/money';

declare global {
	interface BigInt {
		toJSON(): string;
	}
}

if (typeof BigInt !== 'undefined' && !BigInt.prototype.toJSON) {
	// json.stringify has no native bigint representation, so app payload logging uses usd text.
	BigInt.prototype.toJSON = function toJSON() {
		//
		return asDollars({ bigInt: this.valueOf() });
	};
}

export function setupBigIntSerialization() {
	//
	return true;
}
