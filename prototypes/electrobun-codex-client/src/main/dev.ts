import { CodexDesktopPrototype } from './CodexDesktopPrototype';

const app = new CodexDesktopPrototype();

const shutdown = async (): Promise<void> => {
  await app.shutdown();
  process.exit(0);
};

process.on('SIGINT', () => {
  void shutdown();
});

process.on('SIGTERM', () => {
  void shutdown();
});

const main = async (): Promise<void> => {
  console.info('running headless codex prototype mode (no desktop window). use `bun run dev` for UI.');
  await app.boot();
  await app.startThread('Electrobun prototype thread', process.cwd());
  await app.submitPrompt('Summarize the project status and ask for next step.');
  console.info('prototype booted', app.getState());
};

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('prototype boot failed:', message);
  process.exit(1);
});
