import { convexQuery } from '@convex-dev/react-query';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { api } from 'convex/_generated/api';
import { useMutation } from 'convex/react';
import { useCallback } from 'react';

export function usePreferences({ defaultValue }: { defaultValue?: any } = {}) {
	//
	const queryClient = useQueryClient();
	const setPreference = useMutation(api.users.preferences.public.setPreference);

	const getPreference = (key: string) => {
		//
		const query = convexQuery(api.users.preferences.public.getPreference, { key });
		const { data: preference } = useSuspenseQuery(query);

		return preference?.value;
	};

	const setPreferenceOptimistic = useCallback(
		(key: string, value: any) => {
			//
			const queryKey = convexQuery(api.users.preferences.public.getPreference, { key }).queryKey;

			// Optimistic update using React Query
			queryClient.setQueryData(queryKey, { value });

			// Force refetch to ensure UI updates
			queryClient.invalidateQueries({ queryKey });

			// Save to server
			setPreference({ key, value }).catch((error) => {
				//
				console.error('Failed to save preference:', error);
				// Invalidate query on error to revert to server state
				queryClient.invalidateQueries({ queryKey });
			});
		},
		[setPreference, queryClient],
	);

	const setInboxWidthPercent = useCallback(
		(widthPercent: number) => {
			setPreferenceOptimistic('inboxWidthPercent', widthPercent);
		},
		[setPreferenceOptimistic],
	);

	const getInboxWidthPercent = () => {
		//
		const preference = getPreference('inboxWidthPercent');
		const fallback = typeof defaultValue === 'number' ? defaultValue : 50;

		return typeof preference === 'number' ? preference : fallback;
	};

	const setTaskDetailWidthPercentDesktop = useCallback(
		(widthPercent: number) => {
			setPreferenceOptimistic('taskDetailWidthPercentDesktop', widthPercent);
		},
		[setPreferenceOptimistic],
	);

	const getTaskDetailWidthPercentDesktop = () => {
		//
		const preference = getPreference('taskDetailWidthPercentDesktop');
		const fallback = typeof defaultValue === 'number' ? defaultValue : 50;

		return typeof preference === 'number' ? preference : fallback;
	};

	const setTaskDetailWidthPercentMobile = useCallback(
		(widthPercent: number) => {
			setPreferenceOptimistic('taskDetailWidthPercentMobile', widthPercent);
		},
		[setPreferenceOptimistic],
	);

	const getTaskDetailWidthPercentMobile = () => {
		//
		const preference = getPreference('taskDetailWidthPercentMobile');
		const fallback = typeof defaultValue === 'number' ? defaultValue : 50;

		return typeof preference === 'number' ? preference : fallback;
	};

	const setEnabledSkills = useCallback(
		(enabledSkills: string[]) => {
			setPreferenceOptimistic('enabledSkills', enabledSkills);
		},
		[setPreferenceOptimistic],
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
			setPreferenceOptimistic('taskListVisible', isVisible);
		},
		[setPreferenceOptimistic],
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
