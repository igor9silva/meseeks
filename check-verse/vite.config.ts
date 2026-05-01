import { defineConfig } from 'vite';

export default defineConfig({
	build: {
		target: 'es2022',
	},
	server: {
		host: '0.0.0.0',
		port: 3010,
	},
});
