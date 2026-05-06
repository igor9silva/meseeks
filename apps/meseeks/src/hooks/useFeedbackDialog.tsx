import { createContext, useContext, useState } from 'react';

interface FeedbackDialogContextType {
	isOpen: boolean;
	open: () => void;
	close: () => void;
}

const FeedbackDialogContext = createContext<FeedbackDialogContextType | null>(null);

export function useFeedbackDialog() {
	//
	const context = useContext(FeedbackDialogContext);

	if (!context) {
		throw new Error('useFeedbackDialog must be used within FeedbackDialogProvider');
	}

	return context;
}

export function FeedbackDialogProvider({ children }: { children: React.ReactNode }) {
	//
	const [isOpen, setIsOpen] = useState(false);

	const value = {
		isOpen,
		open: () => setIsOpen(true),
		close: () => setIsOpen(false),
	};

	return <FeedbackDialogContext.Provider value={value}>{children}</FeedbackDialogContext.Provider>;
}
