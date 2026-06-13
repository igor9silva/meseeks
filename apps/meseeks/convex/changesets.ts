import { zid } from 'convex-helpers/server/zod3';
import { mutation, query } from 'lib/convex';
import {
	getChangeset as getChangesetHelper,
	listChangesets as listChangesetsHelper,
	revertChangeset as revertChangesetHelper,
} from './changesets.private';

export const listChangesets = query({
	args: {
		directory: zid('files'),
	},
	handler: listChangesetsHelper,
});

export const getChangeset = query({
	args: {
		changeset: zid('changesets'),
	},
	handler: getChangesetHelper,
});

export const revertChangeset = mutation({
	args: {
		changeset: zid('changesets'),
	},
	handler: revertChangesetHelper,
});
