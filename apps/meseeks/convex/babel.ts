'use node';

import { transform } from '@babel/core';
import { z } from 'zod/v3';
import { internalAction } from 'lib/convex';

// called by render flows that need jsx transpiled before sandbox iframe execution
export const _transpileCode = internalAction({
	args: {
		code: z.string(),
	},
	handler: async (ctx, { code }) => {
		//
		const result = transform(code, {
			presets: [require('@babel/preset-react')],
			// TODO: React compiler plugins: [require('babel-plugin-react-compiler')],
			filename: 'component.jsx',
		});

		if (!result || !result.code) {
			throw new Error('Babel transformation returned no code');
		}

		// simple post-processing to convert export statements to global assignments
		return result.code
			.replace(/export\s+const\s+(\w+)\s*=/g, 'window.$1 = ')
			.replace(/export\s+function\s+(\w+)/g, 'window.$1 = function $1')
			.replace(/export\s+default\s+/g, 'window.default = ');
	},
});
