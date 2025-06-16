import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { api } from 'convex/_generated/api';
import { Doc, Id } from 'convex/_generated/dataModel';
import { AnimatePresence, motion } from 'motion/react';
import { forwardRef, useEffect, useRef, useState } from 'react';
import { useClickOutside } from '~/hooks/useClickOutside';
import { cn } from '~/lib/utils';

// import { TaskAction } from '~/components/TaskAction';
import { Button } from '~/components/ui/button';

const TRANSITION = { duration: 0.25, type: 'spring' };

export function ActionIsland({
	taskId, //
	className,
}: {
	taskId: Id<'tasks'>;
	className?: string;
}) {
	//
	const ref = useRef<HTMLDivElement>(null);
	const [isExpanded, setIsExpanded] = useState(false);

	const query = convexQuery(api.action.public.findAllRunning, { taskId });
	const { data: runningActions } = useSuspenseQuery(query);

	// if click outside, close
	useClickOutside(ref, () => setIsExpanded(false), isExpanded);

	// collapse on ESC
	useEffect(() => {
		//
		if (!isExpanded) return;

		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				setIsExpanded(false);
			}
		};

		window.addEventListener('keydown', handleEscape);
		return () => window.removeEventListener('keydown', handleEscape);
	}, [isExpanded]);

	return (
		<motion.div
			ref={ref}
			className={cn(
				'z-100 text-secondary-foreground rounded-lg cursor-pointer overflow-hidden max-w-[95%]',
				className,
			)}
			transition={TRANSITION}
			initial={{
				top: 'auto',
			}}
			animate={{
				width: isExpanded ? '24rem' : 'auto',
				top: '0',
			}}
			onClick={() => !isExpanded && setIsExpanded(true)}
		>
			<AnimatePresence mode="popLayout">
				{isExpanded ? <Expanded actions={runningActions} /> : <Collapsed actions={runningActions} />}
			</AnimatePresence>
		</motion.div>
	);
}

const Expanded = forwardRef<HTMLDivElement, { actions: Doc<'actions'>[] }>(({ actions }, ref) => {
	//
	// auto-scroll to bottom when rendered
	useEffect(() => {
		//
		if (ref && typeof ref === 'object' && ref.current) {
			ref.current.scrollTop = ref.current.scrollHeight;
		}
	}, [ref, actions]);

	return (
		<motion.div
			ref={ref}
			key="expanded"
			transition={TRANSITION}
			initial={{ opacity: 0, height: 0 }}
			animate={{ opacity: 1, height: 'auto' }}
			className="absolute max-h-96 w-96 bg-secondary rounded-lg overflow-y-auto scrollbar-thin scrollbar-track-muted/20 scrollbar-thumb-muted-foreground/50 hover:scrollbar-thumb-muted-foreground/80 z-50"
		>
			<div className="p-4">
				<div className="flex items-center justify-between mb-4">
					<h3 className="font-medium">Actions</h3>
					<span className="text-sm text-gray-400">{actions.length} actions</span>
				</div>
				{/* <div className="space-y-3">
					{actions.map((action) => (
						<TaskAction key={action._id} action={action} />
					))}
				</div> */}
			</div>
		</motion.div>
	);
});
Expanded.displayName = 'Expanded';

const Collapsed = forwardRef<HTMLButtonElement, { actions: Doc<'actions'>[] }>(({ actions }, ref) => {
	return (
		<Button
			ref={ref}
			variant="ghost"
			className="h-full flex items-center justify-center gap-2 text-sm px-3 truncate"
		>
			<CollapsedContent actions={actions} />
		</Button>
	);
});
Collapsed.displayName = 'Collapsed';

const CollapsedContent = ({ actions }: { actions: Doc<'actions'>[] }) => {
	//
	// const runningActions = actions.filter((action) => action.status === 'running');
	// const pendingActions = actions.filter((action) => action.status === 'pending');
	// const failedActions = actions.filter((action) => action.status === 'failed');

	if (actions.length > 0) {
		//
		// const runningAction = runningActions[0];

		return (
			<>
				{/* <Loader2 className="size-4 animate-spin" /> */}
				{/* <StatusIndicator className="bg-green-500" /> */}
				{/* <span>acting</span> */}
			</>
		);
	}

	// if (failedActions.length > 0) {
	// 	return (
	// 		<>
	// 			{/* <X className="size-4" /> */}
	// 			<Indicator className="bg-red-500" />
	// 			<span>blocked</span>
	// 		</>
	// 	);
	// }

	return (
		<>
			{/* <Activity className="size-4" /> */}
			{/* <span className="size-1.5 animate-pulse rounded-full bg-blue-500" /> */}
			{/* {actions.length > 0 ? ( //
				<span>{actions.length} done</span>
			) : (
				<span>No activity</span>
			)} */}
			{/* <StatusIndicator className="bg-gray-500" pulse={false} /> */}
			{/* <span>idle</span> */}
		</>
	);
};
