import { compile, run } from '@mdx-js/mdx';
import { useQuery } from '@tanstack/react-query';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';

async function compileMDX(mdx: string, shouldRenderComponents = false) {
	return String(
		await compile(mdx, {
			format: shouldRenderComponents ? 'mdx' : 'md',
			outputFormat: 'function-body',
			remarkPlugins: [
				remarkGfm, //
				remarkBreaks,
			],
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

export function useMDX(mdx: string, shouldRenderComponents = false) {
	//
	const {
		data: Component,
		error,
		isPending,
	} = useQuery({
		retry: false,
		queryKey: ['mdx', shouldRenderComponents ? 'components' : 'markdown', mdx],
		queryFn: async () => {
			const code = await compileMDX(mdx, shouldRenderComponents);
			return await runMDX(code);
		},
		staleTime: Number.POSITIVE_INFINITY,
	});

	return { Component, error, isPending };
}
