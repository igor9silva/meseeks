import type { ElectrobunConfig } from 'electrobun';

export default {
  app: {
    name: 'Meseeks Codex',
    identifier: 'dev.meseeks.codex.client',
    version: '0.1.0',
    description: 'Codex macOS app replacement prototype built with Electrobun',
  },
  build: {
    bun: {
      entrypoint: 'src/bun/index.ts',
    },
    copy: {
      'src/mainview/index.html': 'views/mainview/index.html',
      'src/mainview/styles.css': 'views/mainview/styles.css',
      'src/mainview/app.js': 'views/mainview/app.js',
    },
    mac: {
      bundleCEF: false,
    },
    linux: {
      bundleCEF: false,
    },
    win: {
      bundleCEF: false,
    },
  },
  runtime: {
    exitOnLastWindowClosed: true,
  },
} satisfies ElectrobunConfig;
