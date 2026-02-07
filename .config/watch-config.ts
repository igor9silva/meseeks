#!/usr/bin/env bun
/**
 * MCP Config Watcher
 *
 * Watches .config/mcp.config.ts for changes and regenerates
 * MCP configuration files automatically.
 *
 * Usage:
 *   bun run .config/watch-config.ts
 */

import { watch } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

const CONFIG_FILE = resolve(__dirname, './mcp.config.ts');
const GENERATOR_SCRIPT = resolve(__dirname, './generate-configs.ts');

console.log(`👀 Watching ${CONFIG_FILE} for changes...`);

// Initial generation
regenerate();

// Watch for changes
watch(CONFIG_FILE, (eventType) => {
	if (eventType === 'change') {
		console.log('\n📝 MCP config changed, regenerating...');
		regenerate();
	}
});

function regenerate(): void {
	const start = Date.now();
	const proc = spawn('bun', ['run', GENERATOR_SCRIPT], {
		stdio: 'inherit',
		shell: false,
	});

	proc.on('close', (code) => {
		const duration = Date.now() - start;
		if (code === 0) {
			console.log(`✨ Done in ${duration}ms\n`);
		} else {
			console.error(`❌ Failed with code ${code}\n`);
		}
	});
}
