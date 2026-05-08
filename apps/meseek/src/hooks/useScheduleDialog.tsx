import { Id } from 'convex/_generated/dataModel';
import { createContext, useContext, useState } from 'react';

interface ScheduleDialogContextType {
	isOpen: boolean;
	taskId: Id<'tasks'> | null;
	open: (taskId: Id<'tasks'>) => void;
	close: () => void;
}

const ScheduleDialogContext = createContext<ScheduleDialogContextType | null>(null);

export function useScheduleDialog() {
	//
	const context = useContext(ScheduleDialogContext);

	if (!context) {
		throw new Error('useScheduleDialog must be used within ScheduleDialogProvider');
	}

	return context;
}

export function ScheduleDialogProvider({ children }: { children: React.ReactNode }) {
	//
	const [isOpen, setIsOpen] = useState(false);
	const [taskId, setTaskId] = useState<Id<'tasks'> | null>(null);

	const value = {
		isOpen,
		taskId,
		open: (taskId: Id<'tasks'>) => {
			setTaskId(taskId);
			setIsOpen(true);
		},
		close: () => {
			setIsOpen(false);
			setTaskId(null);
		},
	};

	return <ScheduleDialogContext.Provider value={value}>{children}</ScheduleDialogContext.Provider>;
}
