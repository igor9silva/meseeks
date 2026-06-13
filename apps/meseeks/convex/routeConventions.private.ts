export type RouteConventionEntry = {
	path: string;
	content: string;
	storageKey: string;
	contentType: string;
};

export type RouteConventionSeed = Omit<RouteConventionEntry, 'storageKey'>;

const tsxContentType = 'text/tsx; charset=utf-8';

export const routeConventionSeeds: RouteConventionSeed[] = [
	{
		path: '/page.tsx',
		content: `export default function Page() {
	return <main><h1>PRO</h1></main>;
}
`,
		contentType: tsxContentType,
	},
	{
		path: '/inbox/page.tsx',
		content: `export default function Page() {
	return <main><h1>Inbox</h1></main>;
}
`,
		contentType: tsxContentType,
	},
	{
		path: '/tasks/page.tsx',
		content: `export default function Page() {
	return <main><h1>Tasks</h1></main>;
}
`,
		contentType: tsxContentType,
	},
	{
		path: '/tasks/[id]/page.tsx',
		content: `export default function Page() {
	return <main><h1>Task</h1></main>;
}
`,
		contentType: tsxContentType,
	},
	{
		path: '/action/[id]/page.tsx',
		content: `export default function Page() {
	return <main><h1>Action</h1></main>;
}
`,
		contentType: tsxContentType,
	},
];
