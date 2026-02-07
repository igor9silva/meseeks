#!/usr/bin/env bun
/**
 * MCP Config, Rules & Skills Generator
 *
 * Generates MCP configuration files, AI assistant rules, and skills from
 * central sources of truth.
 *
 * Usage:
 *   bun run .config/generate-configs.ts
 *
 * This will create:
 *   - .cursor/mcp.json (for Cursor IDE)
 *   - .opencode/opencode.jsonc (for OpenCode)
 *   - .codex/config.toml (for Codex app)
 *   - AGENTS.md (shared rules for all AI assistants)
 *   - .agents/skills/ (skills for AI assistants)
 *
 * Sources:
 *   - .config/mcp.config.ts → MCP configs
 *   - .config/rules.md → AI assistant rules
 *   - .config/skills/ → AI assistant skills
 *
 * Note: Generated files are gitignored. Edit the source files only.
 */

import { mcpConfig, type MCPServerConfig } from './mcp.config';
import * as fs from 'node:fs';
import * as path from 'node:path';

const PROJECT_ROOT = path.resolve(__dirname, '..');
const RULES_SOURCE = path.join(PROJECT_ROOT, '.config', 'rules.md');
const SKILLS_SOURCE = path.join(PROJECT_ROOT, '.config', 'skills');
const SKILLS_TARGET = path.join(PROJECT_ROOT, '.agents', 'skills');

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

function toTomlString(value: string): string {
	return JSON.stringify(value);
}

function toTomlArray(values: string[]): string {
	return `[${values.map((value) => toTomlString(value)).join(', ')}]`;
}

function toTomlKey(key: string): string {
	return JSON.stringify(key);
}

function getCodexServerConfig(key: string, server: MCPServerConfig): MCPServerConfig {
	//
	if (key !== 'Convex') {
		return server;
	}

	const args = ['run', '.config/codex/convex-mcp-bridge.ts', '--', server.command].concat(server.args);

	return {
		name: server.name,
		command: 'bun',
		args,
		env: server.env,
		enabled: server.enabled,
		description: server.description,
	};
}

/**
 * Generate Codex MCP config (.codex/config.toml)
 */
function generateCodexConfig(): void {
	//
	const enabledServers = getEnabledServers();
	let tomlContent = `# MCP Servers Configuration
# Generated from .config/mcp.config.ts
`;

	if (enabledServers.length === 0) {
		tomlContent += '# No enabled MCP servers.\n';
		writeCodexConfig(tomlContent);
		return;
	}

	for (const [key, server] of enabledServers) {
		const codexServer = getCodexServerConfig(key, server);

		tomlContent += `
# ${server.description || key}
[mcp_servers.${toTomlKey(key)}]
command = ${toTomlString(codexServer.command)}
args = ${toTomlArray(codexServer.args)}
`;

		if (codexServer.env && Object.keys(codexServer.env).length > 0) {
			tomlContent += `
[mcp_servers.${toTomlKey(key)}.env]
`;

			for (const [envKey, envValue] of Object.entries(codexServer.env)) {
				tomlContent += `${toTomlKey(envKey)} = ${toTomlString(envValue)}\n`;
			}
		}
	}

	writeCodexConfig(tomlContent);
}

function writeCodexConfig(content: string): void {
	const codexDir = path.join(PROJECT_ROOT, '.codex');

	if (!fs.existsSync(codexDir)) {
		fs.mkdirSync(codexDir, { recursive: true });
	}

	const codexPath = path.join(codexDir, 'config.toml');

	fs.writeFileSync(codexPath, `${content.trimEnd()}\n`);

	console.log(`✓ Generated ${codexPath}`);
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
 * Generate shared rules file (AGENTS.md)
 *
 * Both Cursor and OpenCode read AGENTS.md, so one file serves all AI assistants.
 */
function generateRules(): void {
	//
	const rulesContent = readRulesSource();
	const rulesPath = path.join(PROJECT_ROOT, 'AGENTS.md');
	fs.writeFileSync(rulesPath, rulesContent);
	console.log(`✓ Generated ${rulesPath}`);

	// clean up deprecated rule files
	const deprecatedFiles = [
		path.join(PROJECT_ROOT, '.cursorrules'),
		path.join(PROJECT_ROOT, '.cursor', 'rules', 'project-rules.mdc'),
	];

	for (const filePath of deprecatedFiles) {
		if (fs.existsSync(filePath)) {
			fs.unlinkSync(filePath);
			console.log(`✓ Removed deprecated ${filePath}`);
		}
	}
}

/**
 * Recursively copy a directory
 */
function copyDirRecursive(src: string, dest: string): void {
	//
	if (!fs.existsSync(dest)) {
		fs.mkdirSync(dest, { recursive: true });
	}

	const entries = fs.readdirSync(src, { withFileTypes: true });

	for (const entry of entries) {
		const srcPath = path.join(src, entry.name);
		const destPath = path.join(dest, entry.name);

		if (entry.isDirectory()) {
			copyDirRecursive(srcPath, destPath);
		} else {
			fs.copyFileSync(srcPath, destPath);
		}
	}
}

/**
 * Generate skills (.agents/skills/)
 *
 * Copies skill files from .config/skills/ to .agents/skills/.
 */
function generateSkills(): void {
	//
	if (!fs.existsSync(SKILLS_SOURCE)) {
		console.log('  No skills source directory found, skipping');
		return;
	}

	// clean target directory
	if (fs.existsSync(SKILLS_TARGET)) {
		fs.rmSync(SKILLS_TARGET, { recursive: true });
	}

	copyDirRecursive(SKILLS_SOURCE, SKILLS_TARGET);

	const skillDirs = fs.readdirSync(SKILLS_SOURCE, { withFileTypes: true }).filter((e) => e.isDirectory());

	console.log(`✓ Generated ${SKILLS_TARGET} (${skillDirs.length} skills)`);
}

// Main execution
console.log('🔄 Generating configuration files...\n');

try {
	// Generate MCP configs
	console.log('📡 MCP Configurations:');
	generateCursorConfig();
	generateOpenCodeConfig();
	generateCodexConfig();

	// Generate rules
	console.log('\n📋 AI Assistant Rules:');
	generateRules();

	// Generate skills
	console.log('\n🧠 AI Assistant Skills:');
	generateSkills();

	console.log('\n✅ All configurations generated successfully!');
	console.log('\nNext steps:');
	console.log('  1. Restart your editor to load new rules');
	console.log('  2. To modify configs, edit files in .config/ and rerun this script');
} catch (error) {
	console.error('\n❌ Error generating configs:', error);
	process.exit(1);
}
