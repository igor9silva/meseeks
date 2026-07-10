import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Id } from 'convex/_generated/dataModel';
import { api } from 'convex/_generated/api';
import type { fileBudgetSchema } from 'schemas/fileSchema';
import type { z } from 'zod/v3';

export type FileViewStatus = 'idle' | 'unread' | 'acting' | 'blocked' | 'done' | 'discarded';

export type FileView = {
	_id: Id<'files'>;
	_creationTime: number;
	owner: Id<'users'>;
	parent?: Id<'files'>;
	name: string;
	content: string;
	summary?: string;
	status: FileViewStatus;
	isActive: boolean;
	energyBudget: z.infer<typeof fileBudgetSchema>;
	budget?: z.infer<typeof fileBudgetSchema>;
	updatedAt: number;
	createdAt: number;
};

export function useFile(fileId: Id<'files'>) {
	//
	const query = convexQuery(api.files.findOne, { fileId });
	const result = useSuspenseQuery(query);

	return {
		...result,
		file: result.data,
	};
}
