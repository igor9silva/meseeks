import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { BasicError } from '~/components/BasicError';
import { Loading } from '~/components/Loading';
import { TaskConversation } from '~/components/TaskConversation';
import TaskDetail from '~/components/TaskDetail';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '~/components/ui/resizable';

export function TaskDetailAndChat({
	className, //
	showExpand = false,
	detailInitialSize = 50,
}: {
	className?: string;
	showExpand?: boolean;
	detailInitialSize?: number;
}) {
	return (
		<Suspense fallback={<Loading />}>
			<ErrorBoundary fallback={<BasicError text="Not found (or something else went wrong)." />}>
				<ResizablePanelGroup direction="vertical" className="overflow-hidden">
					<ResizablePanel id="details" order={0} defaultSize={detailInitialSize} minSize={25}>
						{<TaskDetail className={className} showExpand={showExpand} />}
					</ResizablePanel>
					<ResizableHandle withHandle />
					<ResizablePanel id="substasks" order={1} defaultSize={100 - detailInitialSize} minSize={25}>
						{/* {<SubtaskList taskId={taskId} />} */}
						<TaskConversation />
					</ResizablePanel>
				</ResizablePanelGroup>
			</ErrorBoundary>
		</Suspense>
	);
}
