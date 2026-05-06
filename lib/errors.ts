import { ConvexError } from 'convex/values';
import { Doc } from 'convex/_generated/dataModel';

export const NOT_FOUND_ERROR = 'Not Found';
export const UNAUTHORIZED_ERROR = 'Unauthorized';
export const INSUFFICIENT_ACCOUNT_FUNDS_ERROR = 'Insufficient Account Balance';
export const NOT_ENOUGH_BUDGET_ERROR = 'Not Enough Task Budget';
export const NOT_IMPLEMENTED_ERROR = 'Not Implemented';

const createError = (code: string) => (message?: string) =>
	new ConvexError({
		code,
		...(message && { message }),
	});

export const NotFound = createError(NOT_FOUND_ERROR);
export const Unauthorized = createError(UNAUTHORIZED_ERROR);
export const InsufficientAccountFunds = createError(INSUFFICIENT_ACCOUNT_FUNDS_ERROR);
export const NotImplemented = createError(NOT_IMPLEMENTED_ERROR);
export const NotEnoughBudget = (
	message: string,
	action: Doc<'actions'>,
	previousActionKey: string,
	estimatedCost: bigint,
) =>
	new ConvexError<{
		code: string;
		message: string;
		action: Doc<'actions'>;
		previousActionKey: string;
		estimatedCost: bigint;
	}>({
		code: NOT_ENOUGH_BUDGET_ERROR,
		message,
		action,
		previousActionKey,
		estimatedCost,
	});

export const isError = (key: string, error: unknown) => error instanceof ConvexError && error.data.code === key;
export const messageFrom = (error: unknown, defaultMessage?: string) => {
	//
	if (error instanceof ConvexError) {
		return error.data.message;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return defaultMessage ?? 'Unknown error';
};
