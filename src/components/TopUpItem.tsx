import { Link } from '@tanstack/react-router';
import { Doc } from 'convex/_generated/dataModel';
import { TimeAgo } from '~/components/TimeAgo';

export const topUpStatusColors = {
	waiting: 'bg-yellow-100 text-yellow-800',
	pending: 'bg-yellow-100 text-yellow-800',
	confirmed: 'bg-green-100 text-green-800',
	failed: 'bg-red-100 text-red-800',
};

export function TopUpItem({ topUp }: { topUp: Doc<'topUps'> }) {
	//

	return (
		<li className="rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
			<Link to="/top-up/$id" params={{ id: topUp._id }} className="text-primary hover:underline font-medium">
				<div className="flex items-center justify-between gap-4">
					<div className="flex flex-col min-w-0">
						<span className="truncate">{topUp._id}</span>
						<TimeAgo date={topUp._creationTime} />
					</div>

					<span
						className={`shrink-0 px-3 py-1 rounded-full text-sm font-medium ${
							topUpStatusColors[topUp.status as keyof typeof topUpStatusColors]
						}`}
					>
						{topUp.status}
					</span>
				</div>
			</Link>
		</li>
	);
}
