import { asDollars } from 'convex/lib/money';
import React from 'react';
import { useActionDetails } from '~/hooks/query/useActionDetails';
import { useComposition } from '~/hooks/query/useComposition';
import { useIntelligences } from '~/hooks/query/useIntelligences';
import { useSchedules } from '~/hooks/query/useSchedules';
import { usePersonalSkills, usePublicSkills, useSkill } from '~/hooks/query/useSkills';
import { useSubtasks } from '~/hooks/query/useSubtasks';
import { useTask } from '~/hooks/query/useTask';
import { useTopUp, useTopUpHistory, useWaitingTopUps } from '~/hooks/query/useTopUps';
import { useLockedBalance } from '~/hooks/query/useTransactions';
import { useContainerBreakpoint } from '~/hooks/useContainerBreakpoint';
import { useCurrentTask } from '~/hooks/useCurrentTask';
import { useOptimisticTaskUpdate } from '~/hooks/useOptimisticTaskUpdate';
import { useSkillMutations } from '~/hooks/useSkillMutations';
import { useTaskMutations } from '~/hooks/useTaskMutations';
import { cn } from '~/lib/utils';

// declare global window interface for runtime globals
declare global {
	interface Window {
		//
		React: typeof React;
		useRef: typeof React.useRef;
		useState: typeof React.useState;
		useEffect: typeof React.useEffect;
		useMemo: typeof React.useMemo;
		useCallback: typeof React.useCallback;
		useReducer: typeof React.useReducer;
		useContext: typeof React.useContext;
		useLayoutEffect: typeof React.useLayoutEffect;

		// Query hooks
		useActionDetails: typeof useActionDetails;
		useComposition: typeof useComposition;
		useIntelligences: typeof useIntelligences;
		useSchedules: typeof useSchedules;
		usePersonalSkills: typeof usePersonalSkills;
		usePublicSkills: typeof usePublicSkills;
		useSkill: typeof useSkill;
		useSubtasks: typeof useSubtasks;
		useTask: typeof useTask;
		useTopUpHistory: typeof useTopUpHistory;
		useWaitingTopUps: typeof useWaitingTopUps;
		useTopUp: typeof useTopUp;
		useLockedBalance: typeof useLockedBalance;

		// Other hooks
		useCurrentTask: typeof useCurrentTask;
		useContainerBreakpoint: typeof useContainerBreakpoint;
		useTaskMutations: typeof useTaskMutations;
		useSkillMutations: typeof useSkillMutations;
		useOptimisticTaskUpdate: typeof useOptimisticTaskUpdate;

		// Utilities
		asDollars: typeof asDollars;
		cn: typeof cn;
	}
}

export function useSetupWindowGlobals() {
	//
	const hasSetup = React.useRef(false);

	React.useEffect(() => {
		//
		if (hasSetup.current) return;

		// React core hooks
		window.React = React;
		window.useRef = React.useRef;
		window.useState = React.useState;
		window.useEffect = React.useEffect;
		window.useMemo = React.useMemo;
		window.useCallback = React.useCallback;
		window.useReducer = React.useReducer;
		window.useContext = React.useContext;
		window.useLayoutEffect = React.useLayoutEffect;

		// Query hooks
		window.useActionDetails = useActionDetails;
		window.useComposition = useComposition;
		window.useIntelligences = useIntelligences;
		window.useSchedules = useSchedules;
		window.usePersonalSkills = usePersonalSkills;
		window.usePublicSkills = usePublicSkills;
		window.useSkill = useSkill;
		window.useSubtasks = useSubtasks;
		window.useTask = useTask;
		window.useTopUpHistory = useTopUpHistory;
		window.useWaitingTopUps = useWaitingTopUps;
		window.useTopUp = useTopUp;
		window.useLockedBalance = useLockedBalance;

		// Other hooks
		window.useCurrentTask = useCurrentTask;
		window.useContainerBreakpoint = useContainerBreakpoint;

		window.useTaskMutations = useTaskMutations;
		window.useSkillMutations = useSkillMutations;
		window.useOptimisticTaskUpdate = useOptimisticTaskUpdate;

		// Utilities
		window.asDollars = asDollars;
		window.cn = cn;

		hasSetup.current = true;
	}, []);
}
