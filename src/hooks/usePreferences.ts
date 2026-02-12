import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useMutation } from 'convex/react';
import { useCallback, useMemo } from 'react';
import { api } from 'convex/_generated/api';

export function usePreferences({ defaultValue }: { defaultValue?: unknown } = {}) {
	//
	const setPreferenceMutation = useMutation(api.users.preferences.set);

	const setPreference = setPreferenceMutation.withOptimisticUpdate((localStore, { key, value }) => {
		//
		const existingPreference = localStore.getQuery(api.users.preferences.get, { key });

		// if we've loaded this preference query, update it optimistically
		if (existingPreference !== undefined && existingPreference !== null) {
			localStore.setQuery(
				api.users.preferences.get,
				{ key },
				{
					...existingPreference,
					value,
				},
			);
		}
	});

	const getPreference = (key: string) => {
		//
		const query = convexQuery(api.users.preferences.get, { key });
		const { data: preference } = useSuspenseQuery(query);

		return preference?.value;
	};

	const setInboxWidthPercent = useCallback(
		(widthPercent: number) => {
			setPreference({ key: 'inboxWidthPercent', value: widthPercent });
		},
		[setPreference],
	);

	const getInboxWidthPercent = () => {
		//
		const preference = getPreference('inboxWidthPercent');
		const fallback = typeof defaultValue === 'number' ? defaultValue : 50;

		return typeof preference === 'number' ? preference : fallback;
	};

	const setTaskDetailWidthPercentDesktop = useCallback(
		(widthPercent: number) => {
			setPreference({ key: 'taskDetailWidthPercentDesktop', value: widthPercent });
		},
		[setPreference],
	);

	const getTaskDetailWidthPercentDesktop = () => {
		//
		const preference = getPreference('taskDetailWidthPercentDesktop');
		const fallback = typeof defaultValue === 'number' ? defaultValue : 50;

		return typeof preference === 'number' ? preference : fallback;
	};

	const setTaskDetailWidthPercentMobile = useCallback(
		(widthPercent: number) => {
			setPreference({ key: 'taskDetailWidthPercentMobile', value: widthPercent });
		},
		[setPreference],
	);

	const getTaskDetailWidthPercentMobile = () => {
		//
		const preference = getPreference('taskDetailWidthPercentMobile');
		const fallback = typeof defaultValue === 'number' ? defaultValue : 50;

		return typeof preference === 'number' ? preference : fallback;
	};

	const setEnabledSkills = useCallback(
		(enabledSkills: string[]) => {
			setPreference({ key: 'enabledSkills', value: enabledSkills });
		},
		[setPreference],
	);

	const getEnabledSkills = (): string[] => {
		//
		const enabledSkills = getPreference('enabledSkills');
		const defaultSkills = Array.isArray(defaultValue) ? defaultValue : [];

		const isString = (value: unknown): value is string => typeof value === 'string';

		if (Array.isArray(enabledSkills)) {
			return enabledSkills.filter(isString);
		}

		return defaultSkills.filter(isString);
	};

	const setIsTaskListVisible = useCallback(
		(isVisible: boolean) => {
			setPreference({ key: 'taskListVisible', value: isVisible });
		},
		[setPreference],
	);

	const getIsTaskListVisible = () => {
		//
		const preference = getPreference('taskListVisible');
		const fallback = typeof defaultValue === 'boolean' ? defaultValue : true;

		return typeof preference === 'boolean' ? preference : fallback;
	};

	return {
		setInboxWidthPercent,
		getInboxWidthPercent,
		setTaskDetailWidthPercentDesktop,
		getTaskDetailWidthPercentDesktop,
		setTaskDetailWidthPercentMobile,
		getTaskDetailWidthPercentMobile,
		setEnabledSkills,
		getEnabledSkills,
		setIsTaskListVisible,
		getIsTaskListVisible,
	};
}
