import * as t from '@babel/types';

/**
 * A Babel plugin that:
 *   1. Only allows imports from the single whitelisted module.
 *   2. Only allows importing the explicitly listed names.
 *   3. Tracks all declared variables (or function parameters) in user code.
 *   4. Throws an error for references to any identifier that isn't:
 *        - An allowed import from @my-compiler/primitives, or
 *        - Declared by the user (variables, function names, params).
 */
export default function strictWhitelistPlugin({ ALLOWED_IMPORTS }) {
	//
	// Collect all known "legal" identifiers in a Set
	const declaredIdentifiers = new Set();

	function addDeclared(name, path) {
		//
		if (declaredIdentifiers.has(name)) return;
		declaredIdentifiers.add(name);
	}

	function checkReference(name, path) {
		//
		// If it's not declared, it's disallowed
		if (!declaredIdentifiers.has(name)) {
			throw new Error(`Identifier "${name}" is not allowed.`);
		}
	}

	return {
		visitor: {
			Program: {
				enter() {
					//
					declaredIdentifiers.clear();

					// Add global objects that are allowed
					for (const [globalObj, methods] of Object.entries(ALLOWED_IMPORTS)) {
						if (!globalObj.startsWith('@')) {
							addDeclared(globalObj);
						}
					}
				},
			},

			ImportDeclaration(path) {
				//
				const importSource = path.node.source.value;

				// Only allow imports from whitelisted modules (those starting with @)
				if (
					!Object.prototype.hasOwnProperty.call(ALLOWED_IMPORTS, importSource) ||
					!importSource.startsWith('@')
				) {
					throw new Error(`Invalid import source "${importSource}".`);
				}

				// For each imported specifier, ensure it's in the allowed list
				const allowedNames = ALLOWED_IMPORTS[importSource];
				for (const spec of path.node.specifiers) {
					if (!t.isImportSpecifier(spec) && !t.isImportDefaultSpecifier(spec)) {
						throw new Error('Only named/default imports allowed.');
					}

					// e.g. import { Div } from '@my-compiler/primitives'
					let importedName = spec.imported?.name || spec.local?.name;
					if (!allowedNames.includes(importedName)) {
						throw new Error(`"${importedName}" is not in ALLOWED_IMPORTS["${importSource}"].`);
					}

					// Add to declared identifiers
					addDeclared(spec.local.name, path);
				}
			},

			// Gather newly declared identifiers (variables, function declarations, params)
			VariableDeclarator(path) {
				//
				if (t.isIdentifier(path.node.id)) {
					addDeclared(path.node.id.name, path);
				}
				// if there's destructuring, you'd recursively add each property name
			},

			FunctionDeclaration(path) {
				//
				if (path.node.id) {
					addDeclared(path.node.id.name, path);
				}
				path.node.params.forEach((param) => {
					if (t.isIdentifier(param)) {
						addDeclared(param.name, path);
					}
					// similarly handle destructured params if needed
				});
			},

			FunctionExpression(path) {
				//
				// If it's a named function expression
				if (path.node.id) {
					addDeclared(path.node.id.name, path);
				}
				path.node.params.forEach((param) => {
					if (t.isIdentifier(param)) {
						addDeclared(param.name, path);
					}
				});
			},

			ArrowFunctionExpression(path) {
				//
				path.node.params.forEach((param) => {
					if (t.isIdentifier(param)) {
						addDeclared(param.name, path);
					}
				});
			},

			MemberExpression(path) {
				//
				// Check if this is a property access on a global object
				if (t.isIdentifier(path.node.object) && !path.node.computed) {
					const objectName = path.node.object.name;
					const propertyName = path.node.property.name;

					// If this is a global object, check if the property is allowed
					if (ALLOWED_IMPORTS[objectName] && !ALLOWED_IMPORTS[objectName].includes(propertyName)) {
						throw new Error(`Method "${propertyName}" is not allowed on global object "${objectName}".`);
					}
				}
			},

			// Check references to all other identifiers:
			Identifier(path) {
				//
				// Skip declaration positions (we've already handled them above)
				if (
					path.parent &&
					(t.isVariableDeclarator(path.parent, { id: path.node }) ||
						t.isFunctionDeclaration(path.parent, { id: path.node }) ||
						t.isFunctionExpression(path.parent, { id: path.node }) ||
						t.isArrowFunctionExpression(path.parent) ||
						t.isObjectProperty(path.parent, { key: path.node, computed: false }) ||
						t.isObjectMethod(path.parent, { key: path.node, computed: false }) ||
						t.isMemberExpression(path.parent) || // Skip all member expressions, we handle them separately
						// etc. to skip property keys in object literals, etc.
						false)
				) {
					return;
				}

				// This is a *usage* of an identifier. Check if it's in our declared set.
				checkReference(path.node.name, path);
			},
		},
	};
}
