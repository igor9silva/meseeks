#!/usr/bin/env bun
/**
 * MCP Config Generator
 *
 * Generates MCP configuration files for both Cursor and OpenCode
 * from the central .config/mcp.config.ts source of truth.
 *
 * Usage:
 *   bun run .config/generate-mcp-configs.ts
 *
 * This will create:
 *   - .cursor/mcp.json (for Cursor IDE)
 *   - .opencode/opencode.jsonc (for OpenCode)
 *
 * Note: Disabled entries are omitted from all outputs.
 */

import { mcpConfig } from './mcp.config';
import * as fs from 'node:fs';
import * as path from 'node:path';

const PROJECT_ROOT = path.resolve(__dirname, '..');

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

// Main execution
console.log('🔄 Generating MCP configuration files...\n');

try {
	generateCursorConfig();
	generateOpenCodeConfig();

	console.log('\n✅ All MCP configs generated successfully!');
} catch (error) {
	console.error('\n❌ Error generating MCP configs:', error);
	process.exit(1);
}
