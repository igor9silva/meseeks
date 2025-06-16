import { Card, CardContent, CardFooter, CardHeader } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';

export function SkillCardSkeleton() {
	//
	return (
		<Card>
			<CardHeader className="pb-2">
				<div className="flex justify-between items-start">
					<div className="space-y-1.5">
						<Skeleton className="h-5 w-[120px]" />
						<Skeleton className="h-4 w-[200px]" />
					</div>
					<Skeleton className="h-8 w-8 rounded-full" />
				</div>
			</CardHeader>
			<CardContent className="pb-2">
				<div className="flex flex-wrap gap-2 mb-2">
					<Skeleton className="h-6 w-20" />
					<Skeleton className="h-6 w-24" />
				</div>
			</CardContent>
			<CardFooter>
				<div className="flex justify-between w-full space-x-4">
					<Skeleton className="h-4 w-[80px]" />
					<Skeleton className="h-4 w-[80px]" />
				</div>
			</CardFooter>
		</Card>
	);
}
