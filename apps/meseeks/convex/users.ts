import { internalMutation, query } from 'lib/convex';
import { addUser, getCurrentUser, updateUser } from './users.private';

// called by the better auth user.onCreate trigger to add the app user row or
// link the auth user to an existing one.
export const _addUser = internalMutation({
	args: addUser.args.shape,
	handler: addUser,
});

// called by the better auth user.onUpdate trigger to keep the linked app user in sync
export const _updateUser = internalMutation({
	args: updateUser.args.shape,
	handler: updateUser,
});

// public entrypoint used by the app; keeps auth + allowlist logic centralized in users.private.getCurrentUser
export const current = query({
	args: getCurrentUser.args.shape,
	handler: getCurrentUser,
});
