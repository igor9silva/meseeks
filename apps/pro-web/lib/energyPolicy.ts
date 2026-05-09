export function canSpendPolicy({
	total,
	available,
	amount,
	bufferPercent,
}: {
	total: bigint;
	available: bigint;
	amount: bigint;
	bufferPercent: bigint;
}) {
	//
	const buffer = (total * bufferPercent) / 100n;
	const limit = total + buffer;
	const spent = total - available;

	return spent + amount <= limit;
}
