// Central MCP Configuration
// This file is the single source of truth for MCP server configurations
// Run `bun run build:config` to generate outputs for Cursor, OpenCode, and Codex

export interface MCPServerConfig {
	// Display name for the server
	name: string;
	// Command to run the MCP server
	command: string;
	// Arguments for the command
	args: string[];
	// Environment variables (optional)
	env?: Record<string, string>;
	// Whether the server is enabled by default
	enabled?: boolean;
	// Description of what this MCP server does
	description?: string;
}

export interface MCPConfig {
	servers: Record<string, MCPServerConfig>;
}

export const mcpConfig: MCPConfig = {
	servers: {
		Convex: {
			name: 'Convex',
			command: 'bunx',
			args: [
				'-y', //
				'convex@latest',
				'mcp',
				'start',
				'--dangerously-enable-production-deployments',
			],
			enabled: true,
			description: 'Convex MCP server for database operations',
		},
		// Add more MCP servers here as needed:
		// Example:
		// github: {
		//   name: 'GitHub',
		//   command: 'npx',
		//   args: ['-y', '@modelcontextprotocol/server-github'],
		//   env: {
		//     GITHUB_TOKEN: '${env:GITHUB_TOKEN}',
		//   },
		//   enabled: true,
		//   description: 'GitHub MCP server',
		// },
	},
};

export default mcpConfig;
