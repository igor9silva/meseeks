import generate from '@babel/generator';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { ALLOWED_IMPORTS } from './allowedFeatures.js';
import strictWhitelistPlugin from './strictWhitelistPlugin.js';

export function compileReactCode(inputCode) {
	//
	let ast;
	try {
		ast = parse(inputCode, {
			sourceType: 'module',
			plugins: ['jsx'],
		});
	} catch (parseError) {
		throw new Error(`Parsing error: ${parseError.message}`);
	}

	// Apply our "strict whitelist" plugin using a manual traverse pass
	traverse(ast, strictWhitelistPlugin({ ALLOWED_IMPORTS }).visitor);

	// (Optional) Example transform: rewrite the import source to a secure runtime
	traverse(ast, {
		ImportDeclaration(path) {
			//
			if (ALLOWED_IMPORTS[path.node.source.value]) {
				path.node.source = t.stringLiteral('@my-compiler/secure-runtime');
			}
		},
	});

	const { code } = generate(ast, {}, inputCode);
	return code;
}
