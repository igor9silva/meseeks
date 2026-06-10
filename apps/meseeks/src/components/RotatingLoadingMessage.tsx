import { useEffect, useState } from 'react';
import { TextShimmer } from '@pro/ui/text-shimmer';
import { cn } from '@pro/ui/lib/utils';

const LOADING_MESSAGES = [
	'Teaching silicon to be conscious...',
	'Convincing our rocks to think...',
	"Existence is pain! But we're working on it...",
	"Look at me, I'm setting up your account!",
	'Calculating the meaning of life, universe, and everything...',
	'Turning solar radiation into intelligence...',
	'Making these rocks really, really smart...',
	'Ooo-wee, preparing your AI playground!',
	'Creating artificial general awesomeness...',
	'Wubba lubba dub dub! Almost ready...',
	'Teaching computers to pass the butter...',
	'Achieving singularity in 3... 2...',
];

export function RotatingLoadingMessage({ className }: { className?: string }) {
	//
	const [currentMessage, setCurrentMessage] = useState(LOADING_MESSAGES[0]);

	useEffect(() => {
		//
		const interval = setInterval(() => {
			setCurrentMessage((prev) => {
				const availableMessages = LOADING_MESSAGES.filter((msg) => msg !== prev);
				const randomIndex = Math.floor(Math.random() * availableMessages.length);
				return availableMessages[randomIndex];
			});
		}, 1000);

		return () => clearInterval(interval);
	}, []);

	return (
		<div className={cn('flex flex-col items-center justify-center h-screen w-full gap-4', className)}>
			<TextShimmer text={currentMessage} />
		</div>
	);
}
