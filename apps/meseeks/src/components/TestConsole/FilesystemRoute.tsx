import { useMutation } from 'convex/react';
import { Suspense, useEffect } from 'react';
import type { Id } from 'convex/_generated/dataModel';
import { api } from 'convex/_generated/api';
import { Button } from '@reactor/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@reactor/ui/card';
import { TestConsole } from './TestConsole';
import { useCurrentUser } from '~/hooks/useCurrentUser';

export function FilesystemRoute({ path }: { path: string }) {
	//
	const user = useCurrentUser();

	if (!user.root) return <RootBootstrap />;

	return (
		<>
			<RootRuntimeMaintenance root={user.root} />
			<Suspense fallback={<ConsoleFallback path={path} />}>
				<TestConsole path={path} root={user.root} />
			</Suspense>
		</>
	);
}

function RootRuntimeMaintenance({ root }: { root: Id<'files'> }) {
	//
	const ensureRoot = useMutation(api.files.ensureUserRoot);

	useEffect(() => {
		void ensureRoot({});
	}, [ensureRoot, root]);

	return null;
}

function ConsoleFallback({ path }: { path: string }) {
	//
	const displayPath = path ? `/${path}` : '/';

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="grid min-h-0 flex-1 gap-3 overflow-auto bg-muted/30 p-3 md:grid-cols-[18rem_minmax(0,1fr)_28rem] md:overflow-hidden">
				<div className="min-h-64 rounded-lg border bg-card md:min-h-0" />
				<div className="min-h-96 rounded-lg border bg-card md:min-h-0" />
				<div className="min-h-96 rounded-lg border bg-card md:min-h-0" />
			</div>
			<span className="sr-only">Loading {displayPath}</span>
		</div>
	);
}

function RootBootstrap() {
	//
	const ensureRoot = useMutation(api.files.ensureUserRoot);

	return (
		<div className="mx-auto flex h-full w-full max-w-3xl items-center justify-center p-4">
			<Card className="w-full">
				<CardHeader>
					<CardTitle>Root directory</CardTitle>
					<CardDescription>
						Create the root directory before testing the file and Reactor paths.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Button onClick={() => ensureRoot({})}>Create root</Button>
				</CardContent>
			</Card>
		</div>
	);
}
