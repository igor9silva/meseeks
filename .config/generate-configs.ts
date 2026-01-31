#!/usr/bin/env bun
/**
 * MCP Config & Rules Generator
 *
 * Generates MCP configuration files and AI assistant rules for both
 * Cursor and OpenCode from the central sources of truth.
 *
 * Usage:
 *   bun run .config/generate-configs.ts
 *
 * This will create:
 *   - .cursor/mcp.json (for Cursor IDE)
 *   - .cursor/rules/project-rules.mdc (for Cursor IDE) - uses modern .mdc format
 *   - .opencode/opencode.jsonc (for OpenCode)
 *   - AGENTS.md (for OpenCode)
 *
 * Sources:
 *   - .config/mcp.config.ts → MCP configs
 *   - .config/rules.md → AI assistant rules
 *
 * Note: Generated rule files are gitignored. Edit the source files only.
 */

import { mcpConfig } from './mcp.config';
import * as fs from 'node:fs';
import * as path from 'node:path';

const PROJECT_ROOT = path.resolve(__dirname, '..');
const RULES_SOURCE = path.join(PROJECT_ROOT, '.config', 'rules.md');

/**
 * Filter out disabled servers
 */
function getEnabledServers() {
	return Object.entries(mcpConfig.servers).filter(([, server]) => server.enabled !== false);
}

/**
 * Generate Cursor MCP config (.cursor/mcp.json)
 */
function generateCursorConfig(): void {
	const cursorConfig: Record<string, Record<string, unknown>> = {};
	const enabledServers = getEnabledServers();

	for (const [key, server] of enabledServers) {
		cursorConfig[key] = {
			command: server.command,
			args: server.args,
			...(server.env && { env: server.env }),
		};
	}

	const output = {
		mcpServers: cursorConfig,
	};

	const cursorDir = path.join(PROJECT_ROOT, '.cursor');

	if (!fs.existsSync(cursorDir)) {
		fs.mkdirSync(cursorDir, { recursive: true });
	}

	const cursorPath = path.join(cursorDir, 'mcp.json');

	fs.writeFileSync(cursorPath, `${JSON.stringify(output, null, 2)}\n`);

	console.log(`✓ Generated ${cursorPath}`);
}

/**
 * Generate OpenCode MCP config (.opencode/opencode.jsonc)
 */
function generateOpenCodeConfig(): void {
	const enabledServers = getEnabledServers();

	if (enabledServers.length === 0) {
		// Create empty config if no enabled servers
		const jsoncContent = `{
  "$schema": "https://opencode.ai/config.json",
  // MCP Servers Configuration
  // Generated from .config/mcp.config.ts
  "mcp": {}
}
`;
		writeOpenCodeConfig(jsoncContent);
		return;
	}

	let jsoncContent = `{
  "$schema": "https://opencode.ai/config.json",
  // MCP Servers Configuration
  // Generated from .config/mcp.config.ts
  "mcp": {
`;

	const lastIndex = enabledServers.length - 1;

	for (let i = 0; i < enabledServers.length; i++) {
		const [key, server] = enabledServers[i];
		const comma = i < lastIndex ? ',' : '';

		jsoncContent += `    // ${server.description || key}\n`;
		jsoncContent += `    "${key}": {
      "type": "local",
      "command": ["${server.command}", ${server.args.map((a) => `"${a}"`).join(', ')}]`;

		if (server.env) {
			jsoncContent += `,
      "environment": ${JSON.stringify(server.env, null, 6).replace(/\n/g, '\n      ')}`;
		}

		jsoncContent += `
    }${comma}\n`;
	}

	jsoncContent += `  }
}
`;

	writeOpenCodeConfig(jsoncContent);
}

function writeOpenCodeConfig(content: string): void {
	const opencodeDir = path.join(PROJECT_ROOT, '.opencode');

	if (!fs.existsSync(opencodeDir)) {
		fs.mkdirSync(opencodeDir, { recursive: true });
	}

	const opencodePath = path.join(opencodeDir, 'opencode.jsonc');

	fs.writeFileSync(opencodePath, content);

	console.log(`✓ Generated ${opencodePath}`);
}

/**
 * Read the rules source file
 */
function readRulesSource(): string {
	if (!fs.existsSync(RULES_SOURCE)) {
		throw new Error(`Rules source file not found: ${RULES_SOURCE}`);
	}
	return fs.readFileSync(RULES_SOURCE, 'utf-8');
}

/**
 * Generate Cursor rules files (.cursor/rules/*.mdc)
 *
 * Uses the modern .mdc format with frontmatter instead of the deprecated .cursorrules file.
 * See: https://cursor.com/docs/context/rules
 */
function generateCursorRules(): void {
	const rulesContent = readRulesSource();

	// Create .cursor/rules directory
	const cursorRulesDir = path.join(PROJECT_ROOT, '.cursor', 'rules');
	if (!fs.existsSync(cursorRulesDir)) {
		fs.mkdirSync(cursorRulesDir, { recursive: true });
	}

	// Generate the main rules file with .mdc format (frontmatter + content)
	const cursorRulesContent = `---
description: Core project rules for Meseeks codebase - TypeScript safety, code quality, AI SDK usage, and security standards
alwaysApply: true
---

${rulesContent}
`;

	const cursorRulesPath = path.join(cursorRulesDir, 'project-rules.mdc');
	fs.writeFileSync(cursorRulesPath, cursorRulesContent);

	console.log(`✓ Generated ${cursorRulesPath}`);

	// Clean up deprecated .cursorrules file if it exists
	const legacyCursorRulesPath = path.join(PROJECT_ROOT, '.cursorrules');
	if (fs.existsSync(legacyCursorRulesPath)) {
		fs.unlinkSync(legacyCursorRulesPath);
		console.log(`✓ Removed deprecated ${legacyCursorRulesPath}`);
	}
}

/**
 * Generate OpenCode rules file (AGENTS.md)
 */
function generateOpenCodeRules(): void {
	const rulesContent = readRulesSource();

	const opencodeRulesPath = path.join(PROJECT_ROOT, 'AGENTS.md');

	// Add a header noting this is generated
	const opencodeRulesContent = `<!-- 
  Generated from rules.md
  Do not edit this file directly - edit rules.md and regenerate
  Generated: ${new Date().toISOString()}
-->

${rulesContent}
`;

	fs.writeFileSync(opencodeRulesPath, opencodeRulesContent);

	console.log(`✓ Generated ${opencodeRulesPath}`);
}

// Main execution
console.log('🔄 Generating configuration files...\n');

try {
	// Generate MCP configs
	console.log('📡 MCP Configurations:');
	generateCursorConfig();
	generateOpenCodeConfig();

	// Generate rules
	console.log('\n📋 AI Assistant Rules:');
	generateCursorRules();
	generateOpenCodeRules();

	console.log('\n✅ All configurations generated successfully!');
	console.log('\nNext steps:');
	console.log('  1. Restart your editor to load new rules');
	console.log('  2. To modify rules, edit .config/rules.md and rerun this script');
} catch (error) {
	console.error('\n❌ Error generating configs:', error);
	process.exit(1);
}
