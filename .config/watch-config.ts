#!/usr/bin/env bun
/**
 * Config Watcher
 *
 * Watches .config/ source files for changes and regenerates
 * configuration files automatically.
 *
 * Watched sources:
 *   - .config/mcp.config.ts → MCP configs
 *   - .config/MasterPlan.md → AI assistant rules
 *   - .config/skills/ → AI assistant skills
 *
 * Usage:
 *   bun run .config/watch-config.ts
 */

import { watch, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

const CONFIG_FILE = resolve(__dirname, './mcp.config.ts');
const RULES_FILE = resolve(__dirname, './MasterPlan.md');
const SKILLS_DIR = resolve(__dirname, './skills');
const GENERATOR_SCRIPT = resolve(__dirname, './generate-configs.ts');

let isRegenerating = false;

console.log('👀 Watching .config/ for changes...');
console.log(`   - ${CONFIG_FILE}`);
console.log(`   - ${RULES_FILE}`);
console.log(`   - ${SKILLS_DIR}/`);

// Initial generation
regenerate();

// Watch MCP config
watch(CONFIG_FILE, (eventType) => {
	if (eventType === 'change') {
		console.log('\n📝 MCP config changed, regenerating...');
		regenerate();
	}
});

// Watch rules
watch(RULES_FILE, (eventType) => {
	if (eventType === 'change') {
		console.log('\n📝 Rules changed, regenerating...');
		regenerate();
	}
});

// Watch skills directory recursively
if (existsSync(SKILLS_DIR)) {
	watch(SKILLS_DIR, { recursive: true }, (eventType) => {
		if (eventType === 'change' || eventType === 'rename') {
			console.log('\n📝 Skills changed, regenerating...');
			regenerate();
		}
	});
}

function regenerate(): void {
	//
	// debounce rapid changes
	if (isRegenerating) return;
	isRegenerating = true;

	const start = Date.now();
	const proc = spawn('bun', ['run', GENERATOR_SCRIPT], {
		stdio: 'inherit',
		shell: false,
	});

	proc.on('close', (code) => {
		isRegenerating = false;
		const duration = Date.now() - start;
		if (code === 0) {
			console.log(`✨ Done in ${duration}ms\n`);
		} else {
			console.error(`❌ Failed with code ${code}\n`);
		}
	});
}
