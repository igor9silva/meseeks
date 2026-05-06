import type { Doc } from 'convex/_generated/dataModel';
import { useEffect } from 'react';
import { useActionDetails } from '~/hooks/query/useActionDetails';
import { HttpDetailsSection } from './HttpDetailsSection';
import { LlmDetailsSection } from './LlmDetailsSection';

export function ActionDetailsContent({
	action,
	onDataLoaded,
}: {
	action: Doc<'actions'>;
	onDataLoaded?: (data: Doc<'action_details'>) => void;
}) {
	//
	const { actionDetails } = useActionDetails(action._id);

	useEffect(() => {
		//
		if (actionDetails && onDataLoaded) {
			onDataLoaded(actionDetails);
		}
	}, [actionDetails, onDataLoaded]);

	if (!actionDetails) return null;

	return (
		<>
			{actionDetails.skillKind === 'soft' && <LlmDetailsSection actionDetails={actionDetails} />}
			{actionDetails.skillKind === 'hard' && <HttpDetailsSection actionDetails={actionDetails} />}
		</>
	);
}
