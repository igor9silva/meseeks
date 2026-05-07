import { compile, run } from '@mdx-js/mdx';
import { useQuery } from '@tanstack/react-query';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';

async function compileMDX(mdx: string) {
	//
	return String(
		await compile(mdx, {
			format: 'mdx',
			outputFormat: 'function-body',
			remarkPlugins: [remarkGfm, remarkBreaks],
		}),
	);
}

async function runMDX(code: string) {
	//
	const { default: content } = await run(code, {
		Fragment,
		jsx,
		jsxs,
		baseUrl: import.meta.url,
	});

	return content;
}

export function useMDX(mdx: string) {
	//
	const { data, error, isPending } = useQuery({
		queryKey: ['mdx', mdx],
		retry: false,
		staleTime: Number.POSITIVE_INFINITY,
		queryFn: async () => {
			const code = await compileMDX(mdx);
			return runMDX(code);
		},
	});

	return {
		component: data,
		error,
		isPending,
	};
}
