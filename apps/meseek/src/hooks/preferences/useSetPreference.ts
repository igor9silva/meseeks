import { useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';

export function useSetPreference() {
	//
	const setPreferenceMutation = useMutation(api.users.preferences.set);

	return setPreferenceMutation.withOptimisticUpdate((localStore, { key, value }) => {
		//
		const existingPreference = localStore.getQuery(api.users.preferences.get, { key });

		// if we've loaded this preference query, update it optimistically
		if (existingPreference !== undefined && existingPreference !== null) {
			localStore.setQuery(
				api.users.preferences.get, //
				{ key },
				{ ...existingPreference, value },
			);
		}
	});
}
